import { describe, it, expect } from 'vitest';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ballotCsvTemplate, parseBallotCsv, parseVoterCsv } from './ballotImportCsv';

const makeElection = (races: Election['races']): Election => ({
    election_id: 'elec1',
    title: 'Test Election',
    frontend_url: '',
    owner_id: 'owner1',
    state: 'open',
    settings: {} as Election['settings'],
    create_date: new Date().toISOString(),
    update_date: new Date().toISOString(),
    head: true,
    races,
} as Election);

const singleRace = makeElection([{
    race_id: 'r1', title: 'Mayor', voting_method: 'STAR', num_winners: 1,
    candidates: [{ candidate_id: 'a', candidate_name: 'Alice' }, { candidate_id: 'b', candidate_name: 'Bob' }],
}] as Election['races']);

const twoRaces = makeElection([
    { race_id: 'r1', title: 'Mayor', voting_method: 'STAR', num_winners: 1,
        candidates: [{ candidate_id: 'a', candidate_name: 'Alice' }, { candidate_id: 'b', candidate_name: 'Bob' }] },
    { race_id: 'r2', title: 'Council', voting_method: 'IRV', num_winners: 1,
        candidates: [{ candidate_id: 'c', candidate_name: 'Cy' }, { candidate_id: 'd', candidate_name: 'Di' }] },
] as Election['races']);

describe('ballotCsvTemplate', () => {
    it('uses the export headers', () => {
        expect(ballotCsvTemplate(singleRace)).toBe('ballot_id,precinct,Alice,Bob');
        expect(ballotCsvTemplate(twoRaces)).toBe('ballot_id,precinct,Mayor!!Alice,Mayor!!Bob,Council!!Cy,Council!!Di');
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

    it('accepts a re-imported export, including the derived ranked columns', () => {
        const csv = [
            'ballot_id,precinct,Mayor!!Alice,Mayor!!Bob,Council!!Cy,Council!!Di,overvote_rank,has_duplicate_rank',
            'b-1,North,5,1,1,2,,FALSE',
        ].join('\r\n');
        const res = parseBallotCsv(csv, twoRaces);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        expect(res.value.ballots[0].precinct).toBe('North');
        expect(res.value.ballots[0].orderedVotes).toHaveLength(2);
        expect(res.value.ballots[0].orderedVotes[1].slice(0, 2)).toEqual([1, 2]);
    });

    it('requires a ballot_id column', () => {
        const res = parseBallotCsv('Alice,Bob\n5,0\n', singleRace);
        expect(res).toEqual({ ok: false, error: expect.stringContaining('ballot_id') });
    });

    it('names missing and unknown columns', () => {
        expect(parseBallotCsv('ballot_id,Alice\nP-1,5\n', singleRace))
            .toEqual({ ok: false, error: expect.stringContaining('missing candidate columns: Bob') });
        expect(parseBallotCsv('ballot_id,Alice,Bob,Carol\nP-1,5,0,1\n', singleRace))
            .toEqual({ ok: false, error: expect.stringContaining('Carol') });
    });

    it('points at the spreadsheet row of a bad mark', () => {
        const res = parseBallotCsv('ballot_id,Alice,Bob\nP-1,5,0\nP-2,five,0\n', singleRace);
        expect(res).toEqual({ ok: false, error: expect.stringContaining('Row 3, column "Alice"') });
    });

    it('rejects a file with no ballots', () => {
        expect(parseBallotCsv('ballot_id,Alice,Bob\n', singleRace)).toEqual({ ok: false, error: expect.stringContaining('no ballots') });
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
        expect(parseVoterCsv('voter_id,ballot_id\nv1,P-1\n')).toEqual({ ok: false, error: expect.stringContaining('exactly one column') });
    });
});
