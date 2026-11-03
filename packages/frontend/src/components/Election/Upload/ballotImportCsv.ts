import Papa from "papaparse";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { RaceCandidateOrder } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { ImportBallotRow, VoterKey } from "@equal-vote/star-vote-shared/domain_model/BallotImport";
import { encodeOrderedVote } from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";
import { computeRaceOrder } from "./uploadUtils";

// CSV formats for importing ballots into a live election (see docs/help/uploading_ballots.md).
//
// Ballot CSV: the same layout as the results page's CSV export, so an exported
// file can be re-imported unchanged:
//   ballot_id, [precinct], one column per candidate
// Candidate columns are headed by the candidate's name, or `Race Title!!Candidate Name`
// when the election has more than one race. A blank cell is an unmarked candidate.
//
// Voter CSV (only for elections where BetterVoting holds the voter list): a single
// `voter_id` or `email` column listing who cast the ballots, in any order.

export type ParseResult<T> = { ok: true, value: T } | { ok: false, error: string };

export interface ParsedBallotCsv {
    race_order: RaceCandidateOrder[];
    ballots: ImportBallotRow[];
}

export interface ParsedVoterCsv {
    voter_key: VoterKey;
    voter_ids: string[];
}

// Columns the export writes for ranked races. They are derived from the marks on
// import, so they are accepted and ignored. Papa renames repeated headers to name_1, name_2, ...
const DERIVED_COLUMN = /^(overvote_rank|has_duplicate_rank)(_\d+)?$/;

export function candidateColumnHeaders(election: Election): string[][] {
    return election.races.map(race => race.candidates.map(c =>
        election.races.length === 1 ? c.candidate_name : `${race.title}!!${c.candidate_name}`
    ));
}

export function ballotCsvTemplate(election: Election): string {
    return Papa.unparse([['ballot_id', 'precinct', ...candidateColumnHeaders(election).flat()]]);
}

const parseCsv = (text: string) => Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
});

const firstParseError = (parsed: Papa.ParseResult<unknown>) =>
    // a one-column file has no delimiter to detect, which Papa reports as a (non-fatal) error
    parsed.errors.find(e => e.type !== 'Delimiter');

export function parseBallotCsv(text: string, election: Election): ParseResult<ParsedBallotCsv> {
    const parsed = parseCsv(text);
    const parseError = firstParseError(parsed);
    if (parseError) return { ok: false, error: `Unable to read the ballot file (row ${(parseError.row ?? 0) + 2}): ${parseError.message}` };

    const headers = parsed.meta.fields ?? [];
    const candidateHeaders = candidateColumnHeaders(election);
    const allCandidateHeaders = candidateHeaders.flat();
    if (new Set(allCandidateHeaders).size !== allCandidateHeaders.length) {
        return { ok: false, error: 'Two candidates share a column name, so the file cannot tell them apart. Rename one of them first.' };
    }
    if (!headers.includes('ballot_id')) return { ok: false, error: 'The ballot file needs a ballot_id column' };
    const missing = allCandidateHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) return { ok: false, error: `The ballot file is missing candidate columns: ${missing.join(', ')}` };
    const known = new Set(['ballot_id', 'precinct', ...allCandidateHeaders]);
    const unknown = headers.filter(h => !known.has(h) && !DERIVED_COLUMN.test(h));
    if (unknown.length > 0) return { ok: false, error: `The ballot file has columns that are not candidates in this election: ${unknown.join(', ')}` };

    const ballots: ImportBallotRow[] = [];
    for (const [i, row] of parsed.data.entries()) {
        const orderedVotes = [];
        for (const raceHeaders of candidateHeaders) {
            const marks: (number | null)[] = [];
            for (const header of raceHeaders) {
                const cell = (row[header] ?? '').trim();
                if (cell === '') { marks.push(null); continue; }
                if (!/^-?\d+$/.test(cell)) {
                    // +2: 1-based, plus the header row, so this matches the line number in a spreadsheet
                    return { ok: false, error: `Row ${i + 2}, column "${header}": "${cell}" is not a whole number` };
                }
                marks.push(Number(cell));
            }
            orderedVotes.push(encodeOrderedVote(marks, undefined, undefined));
        }
        const precinct = row.precinct?.trim();
        ballots.push({
            ballot_id: (row.ballot_id ?? '').trim(),
            ...(precinct ? { precinct } : {}),
            orderedVotes,
        });
    }
    if (ballots.length === 0) return { ok: false, error: 'The ballot file has no ballots in it' };

    return { ok: true, value: { race_order: computeRaceOrder(election), ballots } };
}

export function parseVoterCsv(text: string): ParseResult<ParsedVoterCsv> {
    const parsed = parseCsv(text);
    const parseError = firstParseError(parsed);
    if (parseError) return { ok: false, error: `Unable to read the voter file (row ${(parseError.row ?? 0) + 2}): ${parseError.message}` };

    const headers = parsed.meta.fields ?? [];
    if (headers.length !== 1 || (headers[0] !== 'voter_id' && headers[0] !== 'email')) {
        return { ok: false, error: 'The voter file must have exactly one column, headed voter_id or email' };
    }
    const voter_key = headers[0] as VoterKey;
    const voter_ids = parsed.data.map(row => (row[voter_key] ?? '').trim());
    if (voter_ids.length === 0) return { ok: false, error: 'The voter file has no voters in it' };
    return { ok: true, value: { voter_key, voter_ids } };
}
