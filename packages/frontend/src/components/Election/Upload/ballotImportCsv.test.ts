import { describe, it, expect } from 'vitest';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ballotCsvLayoutProblem, ballotCsvTemplate, CsvProblem, parseBallotCsv, parseVoterCsv } from './ballotImportCsv';

const makeElection = (races: Election['races'], settings: Partial<Election['settings']> = {}): Election => ({
    election_id: 'elec1',
    title: 'Test Election',
    frontend_url: '',
    owner_id: 'owner1',
    state: 'open',
    settings: { voter_access: 'open', voter_authentication: {}, ...settings } as Election['settings'],
    create_date: new Date().toISOString(),
    update_date: new Date().toISOString(),
    head: true,
    races,
} as Election);

const mayor = { race_id: 'r1', title: 'Mayor', voting_method: 'STAR', num_winners: 1,
    candidates: [{ candidate_id: 'a', candidate_name: 'Alice' }, { candidate_id: 'b', candidate_name: 'Bob' }] };
const council = { race_id: 'r2', title: 'Council', voting_method: 'IRV', num_winners: 1,
    candidates: [{ candidate_id: 'c', candidate_name: 'Cy' }, { candidate_id: 'd', candidate_name: 'Di' }] };
const measure = { race_id: 'r3', title: 'Measure', voting_method: 'Approval', num_winners: 1, enable_write_in: true,
    candidates: [{ candidate_id: 'y', candidate_name: 'Yes' }, { candidate_id: 'n', candidate_name: 'No' }] };
const chooseOne = { race_id: 'r4', title: 'Sheriff', voting_method: 'Plurality', num_winners: 1,
    candidates: [{ candidate_id: 'p', candidate_name: 'Pat' }, { candidate_id: 'q', candidate_name: 'Quin' }] };

const singleRace = makeElection([mayor] as Election['races']);
const twoRaces = makeElection([mayor, council] as Election['races']);
const withWriteIns = makeElection([mayor, measure] as Election['races']);

const problemsOf = (res: ReturnType<typeof parseBallotCsv>): CsvProblem[] => res.ok ? [] : res.problems;
const messages = (res: ReturnType<typeof parseBallotCsv>) => problemsOf(res).map(p => p.message).join(' | ');

describe('ballotCsvTemplate', () => {
    it('uses the export headers, with write-in pairs for races that take them', () => {
        expect(ballotCsvTemplate(singleRace)).toBe('ballot_id,precinct,Alice,Bob');
        expect(ballotCsvTemplate(twoRaces)).toBe('ballot_id,precinct,Mayor!!Alice,Mayor!!Bob,Council!!Cy,Council!!Di');
        expect(ballotCsvTemplate(withWriteIns)).toBe(
            'ballot_id,precinct,Mayor!!Alice,Mayor!!Bob,Measure!!Yes,Measure!!No,'
            + 'Measure!!write_in_1,Measure!!write_in_1_mark,Measure!!write_in_2,Measure!!write_in_2_mark');
    });
});

// Files made from older templates and exports must keep working: these are frozen
// copies of what this version writes. Add new cases; don't edit these.
describe('published formats stay readable', () => {
    it('reads a template-based file from the first release', () => {
        const res = parseBallotCsv('ballot_id,precinct,Mayor!!Alice,Mayor!!Bob,Council!!Cy,Council!!Di\nP-0001,,5,0,1,2\n', twoRaces);
        expect(res.ok).toBe(true);
    });

    it('reads a results export, including the derived ranked columns', () => {
        const csv = [
            'ballot_id,precinct,Mayor!!Alice,Mayor!!Bob,Council!!Cy,Council!!Di,overvote_rank,has_duplicate_rank',
            'b-1,North,5,1,1,2,,FALSE',
        ].join('\r\n');
        const res = parseBallotCsv(csv, twoRaces);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        expect(res.value.ballots[0].precinct).toBe('North');
        expect(res.value.ballots[0].orderedVotes[1].slice(0, 2)).toEqual([1, 2]);
    });

    it('reads write-in pairs', () => {
        const res = parseBallotCsv('ballot_id,precinct,Mayor!!Alice,Mayor!!Bob,Measure!!Yes,Measure!!No,Measure!!write_in_1,Measure!!write_in_1_mark\nP-1,,5,0,1,,Zed,1\n', withWriteIns);
        expect(res.ok).toBe(true);
    });
});

describe('parseBallotCsv', () => {
    it('reads ballot ids and marks, with blank cells as unmarked', () => {
        const res = parseBallotCsv('ballot_id,Alice,Bob\nP-1,5,0\nP-2,,3\n', singleRace);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        expect(res.value.race_order).toEqual([{ race_id: 'r1', candidate_id_order: ['a', 'b'] }]);
        expect(res.value.ballots.map(b => b.ballot_id)).toEqual(['P-1', 'P-2']);
        expect(res.value.ballots[1].orderedVotes[0].slice(0, 2)).toEqual([null, 3]);
    });

    it('accepts Race!!Candidate headers in a single-race election too', () => {
        expect(parseBallotCsv('ballot_id,Mayor!!Alice,Mayor!!Bob\nP-1,5,0\n', singleRace).ok).toBe(true);
    });

    it('requires a ballot_id column', () => {
        expect(messages(parseBallotCsv('Alice,Bob\n5,0\n', singleRace))).toContain('ballot_id');
    });

    it('names missing and unknown columns', () => {
        expect(messages(parseBallotCsv('ballot_id,Alice\nP-1,5\n', singleRace))).toContain('missing candidate columns: Bob');
        expect(messages(parseBallotCsv('ballot_id,Alice,Bob,Carol\nP-1,5,0,1\n', singleRace))).toContain('Carol');
    });

    it('lists every bad mark with its spreadsheet row, ballot and column', () => {
        const res = parseBallotCsv('ballot_id,Alice,Bob\nP-1,5,0\nP-2,five,0\nP-3,9,7\n', singleRace);
        expect(problemsOf(res)).toEqual([
            { row: 3, ballot_id: 'P-2', column: 'Alice', message: '"five" is not a whole number' },
            { row: 4, ballot_id: 'P-3', column: 'Alice', message: 'STAR scores go from 0 to 5, not 9' },
            { row: 4, ballot_id: 'P-3', column: 'Bob', message: 'STAR scores go from 0 to 5, not 7' },
        ]);
    });

    it('says what each voting method expects', () => {
        const ranked = makeElection([council] as Election['races'], { max_rankings: 2 });
        expect(messages(parseBallotCsv('ballot_id,Cy,Di\nP-1,0,3\n', ranked)))
            .toBe('Ranks start at 1 (leave the cell blank for unranked), not 0 | This election allows ranks up to 2, not 3');
        const approval = makeElection([{ ...measure, enable_write_in: false }] as Election['races']);
        expect(messages(parseBallotCsv('ballot_id,Yes,No\nP-1,2,\n', approval))).toContain('Approval marks are 1 (approved) or 0 (not), not 2');
        const plurality = makeElection([chooseOne] as Election['races']);
        expect(problemsOf(parseBallotCsv('ballot_id,Pat,Quin\nP-1,1,1\n', plurality))).toEqual([
            expect.objectContaining({ row: 2, message: expect.stringContaining('is choose-one, but 2 candidates are marked') }),
        ]);
    });

    it('reads write-ins into the request', () => {
        const res = parseBallotCsv('ballot_id,Mayor!!Alice,Mayor!!Bob,Measure!!Yes,Measure!!No,Measure!!write_in_1,Measure!!write_in_1_mark,Measure!!write_in_2,Measure!!write_in_2_mark\nP-1,5,0,,,Zed,1,,\nP-2,1,1,1,,,,,\n', withWriteIns);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        expect(res.value.ballots[0].write_ins).toEqual([{ race_id: 'r3', name: 'Zed', mark: 1 }]);
        expect(res.value.ballots[1].write_ins).toBeUndefined();
    });

    it('points at the write-in cell that is wrong', () => {
        const head = 'ballot_id,Mayor!!Alice,Mayor!!Bob,Measure!!Yes,Measure!!No,Measure!!write_in_1,Measure!!write_in_1_mark';
        expect(problemsOf(parseBallotCsv(`${head}\nP-1,5,0,,,Zed,\nP-2,5,0,,,,1\nP-3,5,0,,,Zed,4\n`, withWriteIns))).toEqual([
            { row: 2, ballot_id: 'P-1', column: 'Measure!!write_in_1_mark', message: 'The write-in "Zed" needs a mark' },
            { row: 3, ballot_id: 'P-2', column: 'Measure!!write_in_1', message: "There's a mark in Measure!!write_in_1_mark but no written-in name" },
            { row: 4, ballot_id: 'P-3', column: 'Measure!!write_in_1_mark', message: 'Approval marks are 1 (approved) or 0 (not), not 4' },
        ]);
    });

    it('refuses write-in columns for a race without write-ins, and unpaired ones', () => {
        expect(messages(parseBallotCsv('ballot_id,Mayor!!Alice,Mayor!!Bob,Measure!!Yes,Measure!!No,Mayor!!write_in_1,Mayor!!write_in_1_mark\nP-1,5,0,,,,\n', withWriteIns)))
            .toContain(`Race "Mayor" doesn't take write-ins`);
        expect(messages(parseBallotCsv('ballot_id,Mayor!!Alice,Mayor!!Bob,Measure!!Yes,Measure!!No,Measure!!write_in_1\nP-1,5,0,,,\n', withWriteIns)))
            .toContain('needs a "Measure!!write_in_1_mark" column');
    });

    it('rejects a file with no ballots', () => {
        expect(messages(parseBallotCsv('ballot_id,Alice,Bob\n', singleRace))).toContain('no ballots');
    });
});

describe('ballotCsvLayoutProblem', () => {
    it('accepts an ordinary election', () => {
        expect(ballotCsvLayoutProblem(withWriteIns)).toBeNull();
    });

    it('refuses names the file could not tell apart', () => {
        expect(ballotCsvLayoutProblem(makeElection([mayor, { ...council, title: 'Mayor' }] as Election['races']))).toContain('Two races share a title');
        expect(ballotCsvLayoutProblem(makeElection([{ ...mayor, title: 'A!!B' }] as Election['races']))).toContain('contains "!!"');
        expect(ballotCsvLayoutProblem(makeElection([{ ...mayor, candidates: [...mayor.candidates, { candidate_id: 'z', candidate_name: 'write_in_1' }] }] as Election['races'])))
            .toContain('also a column name');
    });
});

describe('parseVoterCsv', () => {
    it('reads a voter_id column', () => {
        expect(parseVoterCsv('voter_id\nv1\n v2 \n')).toEqual({ ok: true, value: { voter_key: 'voter_id', voter_ids: ['v1', 'v2'] } });
    });

    it('reads an email column', () => {
        expect(parseVoterCsv('email\na@x.org\n')).toEqual({ ok: true, value: { voter_key: 'email', voter_ids: ['a@x.org'] } });
    });

    it('refuses extra columns, so a file linking voters to ballots is never accepted', () => {
        const res = parseVoterCsv('voter_id,ballot_id\nv1,P-1\n');
        expect(res.ok).toBe(false);
        if (res.ok) return;
        expect(res.problems[0].message).toContain('exactly one column');
    });
});
