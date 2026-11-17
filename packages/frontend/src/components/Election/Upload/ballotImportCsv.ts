import Papa from "papaparse";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { RaceCandidateOrder } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import {
    findImportProblems,
    IMPORT_MAX_WRITE_INS_PER_RACE,
    ImportBallotRow,
    ImportProblem,
    ImportWriteIn,
    VoterKey,
} from "@equal-vote/star-vote-shared/domain_model/BallotImport";
import { encodeOrderedVote } from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";
import { computeRaceOrder } from "./uploadUtils";

// CSV formats for importing ballots into a live election (see docs/help/uploading_ballots.md).
// These are a published format: files made from an older template or export must keep
// working, so headers are only ever added, never renamed (ballotImportCsv.test.ts keeps
// frozen copies).
//
// Ballot CSV: the same layout as the results page's CSV export, so an exported
// file can be re-imported unchanged:
//   ballot_id, [voter_group], one column per candidate, [write-in pairs]
// (`precinct` is the old name of the voter_group column; exports made before the rename
// use it, so it is still read.)
// Candidate columns are headed by the candidate's name, or `Race Title!!Candidate Name`
// when the election has more than one race (accepted in single-race elections too).
// A race that takes write-ins adds pairs of columns, `write_in_1` (the name) and
// `write_in_1_mark`, prefixed with `Race Title!!` like the candidates. A blank cell is
// an unmarked candidate.
//
// Voter CSV (only for elections where BetterVoting holds the voter list): a single
// `voter_id` or `email` column listing who cast the ballots, in any order.

// One problem in a file, located the way a spreadsheet shows it
export interface CsvProblem {
    row?: number;           // spreadsheet row (the header is row 1)
    ballot_id?: string;
    column?: string;
    message: string;
}

export type ParseResult<T> = { ok: true, value: T } | { ok: false, problems: CsvProblem[] };

export interface ParsedBallotCsv {
    race_order: RaceCandidateOrder[];
    ballots: ImportBallotRow[];
}

export interface ParsedVoterCsv {
    voter_key: VoterKey;
    voter_ids: string[];
}

// Columns the export writes for ranked races. They are accepted and ignored on import.
// Papa renames repeated headers to name_1, name_2, ...
const DERIVED_COLUMN = /^(overvote_rank|has_duplicate_rank)(_\d+)?$/;
const VOTER_GROUP_COLUMN = 'voter_group';
const LEGACY_VOTER_GROUP_COLUMN = 'precinct';
const RESERVED_COLUMNS = ['ballot_id', VOTER_GROUP_COLUMN, LEGACY_VOTER_GROUP_COLUMN];
const WRITE_IN_COLUMN = /^write_in_(\d+)(_mark)?$/;
const SEPARATOR = '!!';

// How many write-in pairs the template offers for a race that takes them. More are
// accepted, up to IMPORT_MAX_WRITE_INS_PER_RACE.
export const TEMPLATE_WRITE_IN_PAIRS = 2;

const fail = (message: string): { ok: false, problems: CsvProblem[] } => ({ ok: false, problems: [{ message }] });

export interface RaceColumns {
    race: Race;
    prefix: string;         // '' in a single-race election, 'Race Title!!' otherwise
    candidates: { candidate_id: string, header: string }[];
    writeInHeaders: (n: number) => { name: string, mark: string }; // n is 1-based
}

export function ballotCsvColumns(election: Election): RaceColumns[] {
    return election.races.map(race => {
        const prefix = election.races.length === 1 ? '' : `${race.title}${SEPARATOR}`;
        return {
            race,
            prefix,
            candidates: race.candidates.map(c => ({ candidate_id: c.candidate_id, header: `${prefix}${c.candidate_name}` })),
            writeInHeaders: (n: number) => ({ name: `${prefix}write_in_${n}`, mark: `${prefix}write_in_${n}_mark` }),
        };
    });
}

/** Why this election's races or candidates can't be told apart in a CSV, or null. */
export function ballotCsvLayoutProblem(election: Election): string | null {
    const titles = election.races.map(r => r.title.trim());
    if (election.races.length > 1 && new Set(titles).size !== titles.length) {
        return 'Two races share a title, so the file cannot tell them apart. Rename one of them first.';
    }
    for (const race of election.races) {
        if (race.title.includes(SEPARATOR)) return `The race title "${race.title}" contains "${SEPARATOR}", which the file uses to separate races from candidates. Rename it first.`;
        const names = race.candidates.map(c => c.candidate_name.trim());
        if (new Set(names).size !== names.length) {
            return `Two candidates in "${race.title}" share a name, so the file cannot tell them apart. Rename one of them first.`;
        }
        for (const name of names) {
            if (name.includes(SEPARATOR)) return `The candidate "${name}" contains "${SEPARATOR}", which the file uses to separate races from candidates. Rename them first.`;
            if (RESERVED_COLUMNS.includes(name) || WRITE_IN_COLUMN.test(name) || DERIVED_COLUMN.test(name)) {
                return `The candidate name "${name}" is also a column name in the ballot file. Rename them first.`;
            }
        }
    }
    return null;
}

export function ballotCsvTemplateHeaders(election: Election): string[] {
    return ['ballot_id', VOTER_GROUP_COLUMN, ...ballotCsvColumns(election).flatMap(rc => [
        ...rc.candidates.map(c => c.header),
        ...(rc.race.enable_write_in
            ? Array.from({ length: TEMPLATE_WRITE_IN_PAIRS }, (_, i) => rc.writeInHeaders(i + 1)).flatMap(h => [h.name, h.mark])
            : []),
    ])];
}

export function ballotCsvTemplate(election: Election): string {
    return Papa.unparse([ballotCsvTemplateHeaders(election)]);
}

const parseCsv = (text: string) => Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
});

const firstParseError = (parsed: Papa.ParseResult<unknown>) =>
    // a one-column file has no delimiter to detect, which Papa reports as a (non-fatal) error
    parsed.errors.find(e => e.type !== 'Delimiter');

// The header a column was written with, for each candidate and write-in slot. In a
// single-race election both `Candidate` and `Race!!Candidate` are accepted.
interface ResolvedRace {
    rc: RaceColumns;
    candidateHeader: Map<string, string>;   // candidate_id -> header used in the file
    writeIns: { n: number, name?: string, mark?: string }[]; // slots present in the file, by number
}

function resolveHeaders(election: Election, headers: string[]): { races: ResolvedRace[], problems: CsvProblem[] } {
    const columns = ballotCsvColumns(election);
    const used = new Set<string>(RESERVED_COLUMNS);
    const problems: CsvProblem[] = [];
    const missing: string[] = [];
    const races = columns.map(rc => {
        // the alternative spelling of this race's headers, if any
        const alt = election.races.length === 1 ? `${rc.race.title}${SEPARATOR}` : null;
        const pick = (header: string) => {
            if (headers.includes(header)) return header;
            const other = alt === null ? null : header.startsWith(rc.prefix) ? `${alt}${header.slice(rc.prefix.length)}` : null;
            return other && headers.includes(other) ? other : undefined;
        };
        const candidateHeader = new Map<string, string>();
        for (const c of rc.candidates) {
            const h = pick(c.header);
            if (h) { candidateHeader.set(c.candidate_id, h); used.add(h); } else missing.push(c.header);
        }
        const slots = new Map<number, { n: number, name?: string, mark?: string }>();
        for (const h of headers) {
            const prefixes = [rc.prefix, ...(alt ? [alt] : [])];
            const prefix = prefixes.find(p => h.startsWith(p) && WRITE_IN_COLUMN.test(h.slice(p.length)));
            if (prefix === undefined) continue;
            const [, num, isMark] = h.slice(prefix.length).match(WRITE_IN_COLUMN)!;
            const n = Number(num);
            const slot = slots.get(n) ?? { n };
            if (isMark) slot.mark = h; else slot.name = h;
            slots.set(n, slot);
            used.add(h);
        }
        const writeIns = [...slots.values()].sort((a, b) => a.n - b.n);
        if (writeIns.length > 0 && !rc.race.enable_write_in) {
            problems.push({ column: writeIns[0].name ?? writeIns[0].mark, message: `Race "${rc.race.title}" doesn't take write-ins, so the file can't have write-in columns for it` });
        }
        if (writeIns.length > IMPORT_MAX_WRITE_INS_PER_RACE) {
            problems.push({ column: writeIns[IMPORT_MAX_WRITE_INS_PER_RACE].name, message: `At most ${IMPORT_MAX_WRITE_INS_PER_RACE} write-ins per race` });
        }
        for (const slot of writeIns) {
            if (!slot.name || !slot.mark) {
                const have = slot.name ?? slot.mark!;
                const want = slot.name ? `${have}_mark` : have.replace(/_mark$/, '');
                problems.push({ column: have, message: `Write-in columns come in pairs: "${have}" needs a "${want}" column beside it` });
            }
        }
        return { rc, candidateHeader, writeIns };
    });
    if (missing.length > 0) problems.unshift({ message: `The ballot file is missing candidate columns: ${missing.join(', ')}` });
    const unknown = headers.filter(h => !used.has(h) && !DERIVED_COLUMN.test(h));
    if (unknown.length > 0) problems.push({ message: `The ballot file has columns that are not candidates in this election: ${unknown.join(', ')}` });
    return { races, problems };
}

const WHOLE_NUMBER = /^-?\d+$/;

export function parseBallotCsv(text: string, election: Election): ParseResult<ParsedBallotCsv> {
    const layoutProblem = ballotCsvLayoutProblem(election);
    if (layoutProblem) return fail(layoutProblem);

    const parsed = parseCsv(text);
    const parseError = firstParseError(parsed);
    if (parseError) return fail(`Unable to read the ballot file (row ${(parseError.row ?? 0) + 2}): ${parseError.message}`);

    const headers = parsed.meta.fields ?? [];
    if (!headers.includes('ballot_id')) return fail('The ballot file needs a ballot_id column');
    const { races, problems } = resolveHeaders(election, headers);
    if (problems.length > 0) return { ok: false, problems };

    const race_order = computeRaceOrder(election);
    const ballots: ImportBallotRow[] = [];
    // for each ballot, the mark column each of its write_ins came from
    const writeInColumns: string[][] = [];
    parsed.data.forEach((row, i) => {
        // +2: 1-based, plus the header row, so this matches the row number in a spreadsheet
        const at = { row: i + 2, ballot_id: (row.ballot_id ?? '').trim() || undefined };
        const readMark = (column: string): number | null | 'bad' => {
            const cell = (row[column] ?? '').trim();
            if (cell === '') return null;
            if (!WHOLE_NUMBER.test(cell)) {
                problems.push({ ...at, column, message: `"${cell}" is not a whole number` });
                return 'bad';
            }
            return Number(cell);
        };
        const orderedVotes = race_order.map(order => {
            const resolved = races.find(r => r.rc.race.race_id === order.race_id)!;
            const marks = order.candidate_id_order.map(id => {
                const mark = readMark(resolved.candidateHeader.get(id)!);
                return mark === 'bad' ? null : mark;
            });
            return encodeOrderedVote(marks, undefined, undefined);
        });
        const write_ins: ImportWriteIn[] = [];
        const columnsOfWriteIns: string[] = [];
        for (const { rc, writeIns } of races) {
            for (const slot of writeIns) {
                const name = (row[slot.name!] ?? '').trim();
                const mark = readMark(slot.mark!);
                if (mark === 'bad') continue;
                if (!name && mark === null) continue;
                if (!name) { problems.push({ ...at, column: slot.name, message: `There's a mark in ${slot.mark} but no written-in name` }); continue; }
                if (mark === null) { problems.push({ ...at, column: slot.mark, message: `The write-in "${name}" needs a mark` }); continue; }
                write_ins.push({ race_id: rc.race.race_id, name, mark });
                columnsOfWriteIns.push(slot.mark!);
            }
        }
        const precinct = (row[VOTER_GROUP_COLUMN] ?? row[LEGACY_VOTER_GROUP_COLUMN])?.trim();
        writeInColumns.push(columnsOfWriteIns);
        ballots.push({
            ballot_id: (row.ballot_id ?? '').trim(),
            ...(precinct ? { precinct } : {}),
            orderedVotes,
            ...(write_ins.length > 0 ? { write_ins } : {}),
        });
    });
    if (ballots.length === 0) return fail('The ballot file has no ballots in it');

    // The marks the shared rules refuse, located by the row and column they came from
    const value = { race_order, ballots };
    const locate = (p: ImportProblem): CsvProblem => {
        const at = { row: p.ballot + 2, ballot_id: ballots[p.ballot].ballot_id || undefined };
        const resolved = races.find(r => r.rc.race.race_id === p.race_id);
        if (!resolved) return { ...at, message: p.message };
        if (p.candidate_id !== undefined) return { ...at, column: resolved.candidateHeader.get(p.candidate_id), message: p.message };
        if (p.write_in !== undefined) {
            // p.write_in counts this race's write-ins on the ballot
            const raceColumns = writeInColumns[p.ballot].filter((_, k) => ballots[p.ballot].write_ins![k].race_id === p.race_id);
            return { ...at, column: raceColumns[p.write_in], message: p.message };
        }
        return { ...at, column: resolved.rc.prefix ? resolved.rc.race.title : undefined, message: p.message };
    };
    problems.push(...findImportProblems(election, { ...value, voter_ids: undefined }).map(locate));
    if (problems.length > 0) {
        problems.sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
        return { ok: false, problems };
    }
    return { ok: true, value };
}

export function parseVoterCsv(text: string): ParseResult<ParsedVoterCsv> {
    const parsed = parseCsv(text);
    const parseError = firstParseError(parsed);
    if (parseError) return fail(`Unable to read the voter file (row ${(parseError.row ?? 0) + 2}): ${parseError.message}`);

    const headers = parsed.meta.fields ?? [];
    if (headers.length !== 1 || (headers[0] !== 'voter_id' && headers[0] !== 'email')) {
        return fail('The voter file must have exactly one column, headed voter_id or email');
    }
    const voter_key = headers[0] as VoterKey;
    const voter_ids = parsed.data.map(row => (row[voter_key] ?? '').trim());
    if (voter_ids.length === 0) return fail('The voter file has no voters in it');
    return { ok: true, value: { voter_key, voter_ids } };
}
