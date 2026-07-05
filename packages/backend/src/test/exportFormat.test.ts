import { Star } from '../Tabulators/Star';
import { mapMethodInputs } from './TestHelper';
import { buildElectionExport } from '@equal-vote/star-vote-shared/utils/exportFormat';

// Builds a realistic STAR result and checks the v2 export shape.
describe('buildElectionExport (v2 export format)', () => {
    const names = ['Allison', 'Bill', 'Carmen'];
    const votes = [
        [5, 2, 1],
        [5, 3, 0],
        [4, 0, 5],
        [3, 5, 5],
        [5, 1, 4],
    ];
    const results: any = Star(...mapMethodInputs(names, votes), 1);

    // Minimal election whose race candidates line up with the tabulator names.
    const election: any = {
        election_id: 'testelec',
        title: 'Export format test',
        state: 'closed',
        create_date: '2026-07-05T13:41:39.541Z',
        update_date: '1783258899541', // epoch-ms string — must normalize to ISO
        owner_id: 'owner',
        audit_ids: null,
        public_archive_id: null,
        head: true,
        races: [
            {
                race_id: 'r1',
                title: 'Race 1',
                voting_method: 'STAR',
                num_winners: 1,
                candidates: names.map((n) => ({ candidate_id: n, candidate_name: n })),
            },
        ],
        settings: { public_results: true },
    };

    const ballots: any = votes.map((v, i) => ({
        ballot_id: `b${i}`,
        election_id: 'testelec',
        precinct: null,
        votes: [
            {
                race_id: 'r1',
                scores: names.map((n, j) => ({ candidate_id: n, score: v[j] })),
            },
        ],
    }));

    const out: any = buildElectionExport(election, ballots, [results]);
    const json = JSON.stringify(out);

    test('is versioned and self-describing', () => {
        expect(out.format).toBe('bettervoting-export');
        expect(out.format_version).toBe(2);
        expect(typeof out.exported_at).toBe('string');
        expect(Number.isNaN(Date.parse(out.exported_at))).toBe(false);
    });

    test('drops the O(n^2) pairwise maps from candidate objects', () => {
        expect(json).not.toContain('votesPreferredOver');
        expect(json).not.toContain('winsAgainst');
    });

    test('pairwise matrix is deduped with no self-pairs', () => {
        const pw = out.results[0].pairwise;
        for (const name of names) {
            expect(pw[name]).toBeDefined();
            expect(pw[name][name]).toBeUndefined(); // no self-vs-self
        }
        // Allison beats Bill head-to-head in this ballot set
        expect(pw['Allison']['Bill'].wins).toBe(true);
    });

    test('uses snake_case throughout the results section', () => {
        const r = out.results[0];
        expect(r.voting_method).toBe('STAR');
        expect(r).toHaveProperty('tie_break_type');
        expect(r.summary).toHaveProperty('n_tally_votes');
        expect(r.summary).not.toHaveProperty('nTallyVotes');
        // candidate method field snake_cased
        expect(r.candidates[0]).toHaveProperty('five_star_count');
    });

    test('references candidates by both id and name', () => {
        const elected = out.results[0].elected;
        expect(Array.isArray(elected)).toBe(true);
        expect(elected[0]).toHaveProperty('id');
        expect(elected[0]).toHaveProperty('name');
        expect(elected[0].name).toBe('Allison');
    });

    test('ballot scores stay compact (id + score); names live on election.races', () => {
        const score = out.ballots[0].votes[0].scores[0];
        expect(score).toHaveProperty('candidate_id');
        expect(score).toHaveProperty('score');
        expect(score).not.toHaveProperty('candidate_name'); // not repeated per row
        // name is resolvable from the race candidate list
        const cand = out.election.races[0].candidates.find(
            (c: any) => c.candidate_id === score.candidate_id,
        );
        expect(cand.candidate_name).toBeDefined();
    });

    test('preserves a null score (abstention) distinct from an explicit 0', () => {
        // null = "did not score this candidate"; must NOT be dropped or turned into 0.
        const election2: any = {
            election_id: 'e2',
            title: 'null score test',
            head: true,
            races: [
                {
                    race_id: 'r1',
                    title: 'R',
                    voting_method: 'STAR',
                    num_winners: 1,
                    candidates: [
                        { candidate_id: 'a', candidate_name: 'Amy' },
                        { candidate_id: 'b', candidate_name: 'Bo' },
                    ],
                },
            ],
            settings: {},
        };
        const ballots2: any = [
            {
                ballot_id: 'x',
                election_id: 'e2',
                votes: [
                    {
                        race_id: 'r1',
                        scores: [
                            { candidate_id: 'a', score: 0 }, // flat zero
                            { candidate_id: 'b', score: null }, // abstained on Bo
                        ],
                    },
                ],
            },
        ];
        const o: any = buildElectionExport(election2, ballots2, undefined);
        const scores = o.ballots[0].votes[0].scores;
        const a = scores.find((s: any) => s.candidate_id === 'a');
        const b = scores.find((s: any) => s.candidate_id === 'b');
        expect(a.score).toBe(0);
        expect(b).toHaveProperty('score'); // key kept
        expect(b.score).toBeNull(); // and it stays null, not dropped, not 0
    });

    test('normalizes timestamps to ISO-8601 and omits null fields', () => {
        expect(out.election.update_date).toBe(new Date(1783258899541).toISOString());
        expect(out.election.create_date).toBe('2026-07-05T13:41:39.541Z');
        expect(out.election).not.toHaveProperty('audit_ids'); // null omitted
        expect(out.election).not.toHaveProperty('public_archive_id');
    });
});
