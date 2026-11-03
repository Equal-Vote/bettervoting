import { Election } from "./Election";
import { ElectionSettings } from "./ElectionSettings";
import { ballotValidation, NewBallot, RaceCandidateOrder } from "./Ballot";
import { OrderedVote } from "./Vote";
import { OrderedVoteFormatError, orderedVotesToVotes } from "./OrderedVoteCodec";
import { getVoterAuthenticationMode } from "./VoterAuthenticationMode";

// Admin ballot import (paper ballots, or ballots collected by another system)
//
// Ballots are imported in one of two contexts, decided by whether BetterVoting
// holds the election's voter roll:
//
//   'roll'      — closed elections (closed_admin_managed_ids, closed_bv_managed_ids).
//                 The admin sends the ballots AND a separate list of the voters who
//                 cast them. The two lists are never linked to each other: every
//                 ballot is stored, every listed voter is marked as having voted,
//                 and the counts must match. Nothing records which voter cast which
//                 ballot, so the secret ballot survives the import.
//   'anonymous' — open elections. BetterVoting has no roll to mark, so the admin
//                 sends only the ballots; whoever cast them is tracked outside BV.
//
// An import is all-or-nothing: if any row fails validation nothing is written.
// The pure (no database) rules live here so the frontend can run them before
// submitting and the backend can run the same rules again on the request body.

export const IMPORT_MAX_BALLOTS = 5000;
export const IMPORT_BALLOT_ID_MAX_LENGTH = 64;

export type BallotImportMode = 'roll' | 'anonymous';
export type VoterKey = 'voter_id' | 'email';

export interface ImportBallotRow {
    ballot_id: string;      // admin-supplied, must be new for this election
    precinct?: string;      // optional, only affects which races the ballot may mark
    orderedVotes: OrderedVote[]; // one per race_order entry, see OrderedVoteCodec
}

export interface ImportBallotsRequest {
    race_order: RaceCandidateOrder[];
    ballots: ImportBallotRow[];
    // 'roll' mode only: the voters to mark as having voted, as many as there are ballots
    voter_key?: VoterKey;
    voter_ids?: string[];
}

export interface ImportBallotsResponse {
    imported: number;       // ballots written
    voters_marked: number;  // roll rows marked as submitted (0 in 'anonymous' mode)
}

export function getBallotImportMode(settings: ElectionSettings): BallotImportMode {
    return getVoterAuthenticationMode(settings).startsWith('closed') ? 'roll' : 'anonymous';
}

// closed_bv_managed_ids rolls are keyed by email from the admin's point of view
// (voter ids are BV secrets); closed_admin_managed_ids rolls are keyed by the
// ids the admin uploaded.
export function getDefaultVoterKey(settings: ElectionSettings): VoterKey {
    return getVoterAuthenticationMode(settings) === 'closed_bv_managed_ids' ? 'email' : 'voter_id';
}

// Matches how the roll lookups compare keys (see ElectionRolls.getByVoterID / getByElectionIdAndEmail)
export const normalizeVoterKey = (key: VoterKey, value: string): string =>
    key === 'email' ? value.trim().toLowerCase() : value.trim();

// "ballots 2, 5, 9" / "ballots 2, 5, 9 (+12 more)". Numbers are 1-based positions
// in the ballots list (i.e. the data rows of the CSV, not counting the header).
export function describeRows(noun: string, rows: number[], limit = 10): string {
    const shown = rows.slice(0, limit).map(r => r + 1).join(', ');
    const more = rows.length > limit ? ` (+${rows.length - limit} more)` : '';
    return `${noun}${rows.length === 1 ? '' : 's'} ${shown}${more}`;
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function validateRaceOrder(election: Election, raceOrder: unknown): string | null {
    if (!Array.isArray(raceOrder)) return 'race_order must be an array';
    const seen = new Set<string>();
    for (const entry of raceOrder as RaceCandidateOrder[]) {
        if (!entry || typeof entry.race_id !== 'string' || !Array.isArray(entry.candidate_id_order)) {
            return 'race_order entries must have a race_id and a candidate_id_order';
        }
        const race = election.races.find(r => r.race_id === entry.race_id);
        if (!race) return `race_order refers to a race that is not in this election: ${entry.race_id}`;
        if (seen.has(entry.race_id)) return `race_order lists race ${entry.race_id} more than once`;
        seen.add(entry.race_id);
        const expected = new Set(race.candidates.map(c => c.candidate_id));
        const actual = new Set(entry.candidate_id_order);
        const matches = actual.size === entry.candidate_id_order.length
            && actual.size === expected.size
            && [...actual].every(id => expected.has(id));
        if (!matches) return `race_order does not list every candidate of race "${race.title}" exactly once`;
    }
    const missing = election.races.filter(r => !seen.has(r.race_id));
    if (missing.length > 0) {
        return `race_order is missing ${missing.length === 1 ? 'race' : 'races'} ${missing.map(r => `"${r.title}"`).join(', ')}`;
    }
    return null;
}

function validateVoterIds(election: Election, body: ImportBallotsRequest, mode: BallotImportMode): string | null {
    const voterIds = body.voter_ids;
    if (mode === 'anonymous') {
        if (voterIds !== undefined && !(Array.isArray(voterIds) && voterIds.length === 0)) {
            return 'This election has no voter list, so ballots are imported without voter ids';
        }
        return null;
    }
    if (body.voter_key !== undefined && body.voter_key !== 'voter_id' && body.voter_key !== 'email') {
        return `voter_key must be 'voter_id' or 'email'`;
    }
    const key = body.voter_key ?? getDefaultVoterKey(election.settings);
    if (!Array.isArray(voterIds) || voterIds.length === 0) {
        return 'This election has a voter list, so a list of the voters who cast these ballots is required';
    }
    if (voterIds.length !== body.ballots.length) {
        return `The number of voters (${voterIds.length}) must equal the number of ballots (${body.ballots.length})`;
    }
    const blank = voterIds.map((v, i) => isNonEmptyString(v) ? -1 : i).filter(i => i >= 0);
    if (blank.length > 0) return `Blank ${key} at ${describeRows('voter', blank)}`;
    const seen = new Map<string, number>();
    const dupes: number[] = [];
    voterIds.forEach((v, i) => {
        const norm = normalizeVoterKey(key, v);
        if (seen.has(norm)) dupes.push(i); else seen.set(norm, i);
    });
    if (dupes.length > 0) return `Repeated ${key} at ${describeRows('voter', dupes)}`;
    return null;
}

/**
 * Every rule that can be checked without the database, in the order the backend
 * applies them. Returns the first failure as a human-readable message, or null.
 */
export function validateImportBallotsRequest(election: Election, body: ImportBallotsRequest): string | null {
    if (!body || typeof body !== 'object') return 'Request body is missing';
    const mode = getBallotImportMode(election.settings);

    if (!Array.isArray(body.ballots) || body.ballots.length === 0) return 'No ballots to import';
    if (body.ballots.length > IMPORT_MAX_BALLOTS) {
        return `At most ${IMPORT_MAX_BALLOTS} ballots can be imported at a time (got ${body.ballots.length})`;
    }

    const raceOrderError = validateRaceOrder(election, body.race_order);
    if (raceOrderError) return raceOrderError;

    const badIds: number[] = [];
    const badPrecincts: number[] = [];
    body.ballots.forEach((row, i) => {
        if (!row || !isNonEmptyString(row.ballot_id) || row.ballot_id.trim().length > IMPORT_BALLOT_ID_MAX_LENGTH) badIds.push(i);
        if (row && row.precinct !== undefined && row.precinct !== null && typeof row.precinct !== 'string') badPrecincts.push(i);
    });
    if (badIds.length > 0) return `Missing or invalid ballot_id (1-${IMPORT_BALLOT_ID_MAX_LENGTH} characters) at ${describeRows('ballot', badIds)}`;
    if (badPrecincts.length > 0) return `Invalid precinct at ${describeRows('ballot', badPrecincts)}`;

    const seenIds = new Map<string, number>();
    const dupes: number[] = [];
    body.ballots.forEach((row, i) => {
        const id = row.ballot_id.trim();
        if (seenIds.has(id)) dupes.push(i); else seenIds.set(id, i);
    });
    if (dupes.length > 0) return `Repeated ballot_id at ${describeRows('ballot', dupes)}`;

    const invalid: { row: number, message: string }[] = [];
    body.ballots.forEach((row, i) => {
        if (!Array.isArray(row.orderedVotes)) {
            invalid.push({ row: i, message: 'orderedVotes is missing' });
            return;
        }
        let ballot: NewBallot;
        try {
            ballot = {
                election_id: election.election_id,
                precinct: row.precinct || undefined,
                votes: orderedVotesToVotes(row.orderedVotes, body.race_order),
            };
        } catch (err: unknown) {
            if (err instanceof OrderedVoteFormatError) {
                invalid.push({ row: i, message: err.message });
                return;
            }
            throw err;
        }
        const err = ballotValidation(election, ballot);
        if (err) invalid.push({ row: i, message: err });
    });
    if (invalid.length > 0) {
        return `Invalid ${describeRows('ballot', invalid.map(e => e.row))}. First problem (ballot ${invalid[0].row + 1}): ${invalid[0].message}`;
    }

    return validateVoterIds(election, body, mode);
}
