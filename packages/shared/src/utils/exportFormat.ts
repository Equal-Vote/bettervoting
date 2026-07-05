// exportFormat.ts
//
// Builds the downloadable "Ballot Data" JSON export (Election + Ballots + Results).
//
// The legacy export was `JSON.stringify({ Election, Ballots, Results })` of the raw
// in-memory objects. That leaked the tabulator's internal shape into the export:
//   - every candidate carried O(n^2) `votesPreferredOver` / `winsAgainst` maps keyed by
//     UUID, including self-vs-self entries, duplicated across elected/tied/other/summary
//   - Results used camelCase while Election/Ballots used snake_case
//   - timestamps were inconsistent (ISO create_date vs epoch-ms-string update_date)
//   - ballot scores referenced candidates by UUID only, forcing a join to read them
//
// This builds a versioned, self-describing v2 export: candidates listed once, a deduped
// pairwise matrix (self-pairs removed, keyed by name), elected/tied/other as name lists,
// snake_case keys throughout, ISO-8601 timestamps, null/empty fields omitted, and both
// candidate_id and candidate_name wherever a candidate is referenced.

import { Election } from '../domain_model/Election';
import { AnonymizedBallot } from '../domain_model/Ballot';
import { ElectionResults } from '../domain_model/ITabulators';

export const EXPORT_FORMAT = 'bettervoting-export';
export const EXPORT_FORMAT_VERSION = 2;

/* eslint-disable @typescript-eslint/no-explicit-any */

// camelCase -> snake_case for a single object key
const toSnake = (k: string): string =>
    k
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();

// Deep-convert object keys to snake_case; values are left untouched.
const deepSnake = (v: any): any => {
    if (Array.isArray(v)) return v.map(deepSnake);
    if (v && typeof v === 'object') {
        const out: any = {};
        for (const [k, val] of Object.entries(v)) out[toSnake(k)] = deepSnake(val);
        return out;
    }
    return v;
};

// Recursively drop null / undefined values (keeps the file terse).
const omitEmpty = (v: any): any => {
    if (Array.isArray(v)) return v.map(omitEmpty);
    if (v && typeof v === 'object') {
        const out: any = {};
        for (const [k, val] of Object.entries(v)) {
            if (val === null || val === undefined) continue;
            out[k] = omitEmpty(val);
        }
        return out;
    }
    return v;
};

// Normalize a timestamp (ISO string, epoch-ms number, or epoch-ms string) to ISO-8601.
const normalizeTimestamp = (v: any): string | undefined => {
    if (v === null || v === undefined || v === '') return undefined;
    const asNum =
        typeof v === 'number' ? v : /^\d+$/.test(String(v)) ? Number(v) : NaN;
    if (!Number.isNaN(asNum)) return new Date(asNum).toISOString();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
};

const cleanElection = (e: Election): any => {
    const cleaned: any = omitEmpty({ ...e });
    if (cleaned.create_date) cleaned.create_date = normalizeTimestamp(cleaned.create_date);
    if (cleaned.update_date) cleaned.update_date = normalizeTimestamp(cleaned.update_date);
    return cleaned;
};

// Ballots stay compact (id + score). Candidate names are NOT repeated on every
// ballot row — that re-bloats large elections (e.g. 51 candidates x 100 ballots).
// Names are always resolvable from election.races[].candidates (and, when present,
// results[].candidates), so no information is lost.
//
// IMPORTANT: a score of `null` is MEANINGFUL — it means the voter did not score
// that candidate (an abstention on that candidate), which is distinct from an
// explicit `0` and from scoring the "None of the Above" (c-nota) candidate. So
// scores are preserved verbatim (including null); we do NOT run the null-omitting
// pass over ballot rows. Only genuinely-absent optional metadata is dropped.
const cleanBallots = (ballots: AnonymizedBallot[]): any[] =>
    (ballots ?? []).map((b: any) => {
        const out: any = { ballot_id: b.ballot_id };
        if (b.precinct != null) out.precinct = b.precinct;
        out.votes = (b.votes ?? []).map((v: any) => {
            const vote: any = { race_id: v.race_id };
            if (v.overvote_rank != null) vote.overvote_rank = v.overvote_rank;
            if (v.has_duplicate_rank != null) vote.has_duplicate_rank = v.has_duplicate_rank;
            // Preserve every score exactly, including explicit `null` (= not scored).
            vote.scores = (v.scores ?? []).map((s: any) => ({
                candidate_id: s.candidate_id,
                score: s.score === undefined ? null : s.score,
            }));
            return vote;
        });
        return out;
    });

// Turn one race's tabulator result into the clean v2 shape.
const cleanResult = (r: any): any => {
    const summaryCandidates: any[] = r.summaryData?.candidates ?? [];

    const idToName: Record<string, string> = {};
    summaryCandidates.forEach((c) => {
        idToName[c.id] = c.name;
    });
    const nm = (id: string) => idToName[id] ?? id;
    const refs = (arr: any[] | undefined) =>
        (arr ?? []).map((c: any) => ({ id: c.id, name: nm(c.id) }));

    // Candidates listed once, without the O(n^2) pairwise maps.
    const candidates = summaryCandidates.map((c) => {
        const { votesPreferredOver, winsAgainst, ...rest } = c;
        return deepSnake(rest);
    });

    // Deduped pairwise matrix: self-pairs removed, keyed by candidate name.
    const pairwise: Record<string, Record<string, { prefer: number; wins: boolean }>> = {};
    summaryCandidates.forEach((c) => {
        const row: Record<string, { prefer: number; wins: boolean }> = {};
        Object.keys(c.votesPreferredOver ?? {}).forEach((oid) => {
            if (oid === c.id) return; // drop self-vs-self
            row[nm(oid)] = {
                prefer: c.votesPreferredOver[oid],
                wins: !!c.winsAgainst?.[oid],
            };
        });
        pairwise[nm(c.id)] = row;
    });

    const { candidates: _drop, ...summaryRest } = r.summaryData ?? {};
    const summary = deepSnake(summaryRest);

    const rounds = (r.roundResults ?? []).map((rr: any) => {
        const out: any = {
            winners: refs(rr.winners),
            runner_up: refs(rr.runner_up),
            tied: refs(rr.tied),
            tie_break_type: rr.tieBreakType,
            logs: rr.logs,
        };
        if (rr.eliminated) out.eliminated = refs(rr.eliminated);
        if (rr.exhaustedVoteCount !== undefined) out.exhausted_vote_count = rr.exhaustedVoteCount;
        return omitEmpty(out);
    });

    // Pull off the fields handled explicitly; deepSnake whatever method-specific
    // top-level fields remain (e.g. IRV exhaustedVoteCounts / nExhaustedViaOvervote,
    // STAR_PR logs).
    const {
        summaryData,
        roundResults,
        elected,
        tied,
        other,
        perm,
        votingMethod,
        tieBreakType,
        writeInDiagnostics,
        ...extra
    } = r;

    return omitEmpty({
        voting_method: votingMethod,
        elected: refs(elected),
        tied: refs(tied),
        other: refs(other),
        tie_break_type: tieBreakType,
        candidates,
        pairwise,
        rounds,
        summary,
        perm: perm ? perm.map((id: string) => ({ id, name: nm(id) })) : undefined,
        write_in_diagnostics: writeInDiagnostics ? deepSnake(writeInDiagnostics) : undefined,
        ...deepSnake(extra),
    });
};

export interface ElectionExport {
    format: string;
    format_version: number;
    exported_at: string;
    election: any;
    ballots: any[];
    results?: any[];
}

/**
 * Build the clean, versioned election export object.
 * @param election  the election config
 * @param ballots   anonymized ballots (may be undefined while loading)
 * @param results   per-race tabulation results (optional)
 */
export const buildElectionExport = (
    election: Election,
    ballots: AnonymizedBallot[] | undefined,
    results?: ElectionResults[],
): ElectionExport => ({
    format: EXPORT_FORMAT,
    format_version: EXPORT_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    election: cleanElection(election),
    ballots: cleanBallots(ballots ?? []),
    ...(results ? { results: results.map(cleanResult) } : {}),
});
