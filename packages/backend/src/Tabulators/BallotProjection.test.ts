import { Race, VotingMethod } from "@equal-vote/star-vote-shared/domain_model/Race";
import { Candidate } from "@equal-vote/star-vote-shared/domain_model/Candidate";
import { Vote } from "@equal-vote/star-vote-shared/domain_model/Vote";
import { Score } from "@equal-vote/star-vote-shared/domain_model/Score";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { candidate, rawVote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { makeWriteInCandidateId } from "@equal-vote/star-vote-shared/utils/makeID";
import { trimLower } from "@equal-vote/star-vote-shared/domain_model/Util";
import { orderedVotesToVotes } from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";
import { BallotVotes } from "../Models/IBallotStore";
import { projectBallots } from "./BallotProjection";
import { BLOCK_BALLOTS } from "./CompactVoteStore";
import shuffleCandidatesForRandomTiebreak from "./shuffleCandidatesForRandomTiebreak";
import { get as getTinyRand } from "./tinyrand";
import { VotingMethods } from "./VotingMethodSelecter";

// The compact projection re-encodes the semantic content of every ballot, so a
// bug in it miscounts elections silently rather than failing loudly. These tests
// pin it against `referenceProjection` below — a verbatim copy of the inline
// projection getElectionResultsController used before the streaming rewrite —
// and assert both that the tabulator inputs match and that tabulating each
// voting method over the two produces identical results.

// ---------------------------------------------------------------------------
// Reference implementation (the pre-streaming code path, unchanged)
// ---------------------------------------------------------------------------

const referenceProjection = (race: Race, ballots: BallotVotes[]) => {
    const useWriteIns = race.enable_write_in && race.write_in_candidates && race.write_in_candidates.length > 0
    const writeInCandidates = useWriteIns && race.write_in_candidates ? race.write_in_candidates : []

    const candidates: candidate[] = race.candidates.map((c: Candidate) => ({
        id: c.candidate_id,
        name: c.candidate_name,
        tieBreakOrder: -1,
        votesPreferredOver: {},
        winsAgainst: {}
    }))

    if (useWriteIns) {
        writeInCandidates.forEach((wc) => {
            if (wc.approved) {
                candidates.push({
                    id: makeWriteInCandidateId(wc.candidate_name),
                    name: wc.candidate_name,
                    tieBreakOrder: -1,
                    votesPreferredOver: {},
                    winsAgainst: {}
                })
            }
        })
    }

    const race_id = race.race_id
    const cvr: rawVote[] = []
    let numUnprocessedWriteIns = 0
    let numExcludedWriteIns = 0

    ballots.forEach((ballot) => {
        const vote = ballot.votes.find((vote) => vote.race_id === race_id)
        if (vote) {
            const marks: {[key: string]: number | null} = {}
            vote.scores.forEach(score => {
                const isRegularCandidate = race.candidates.some((c: Candidate) => c.candidate_id === score.candidate_id)
                if (isRegularCandidate) {
                    if (!(score.candidate_id in marks)) {
                        marks[score.candidate_id] = score.score
                    }
                } else if (race.enable_write_in && score.write_in_name) {
                    const write_in_name = score.write_in_name
                    const writeInCandidate = writeInCandidates.find(wc => wc.aliases.includes(trimLower(write_in_name)))
                    if (!writeInCandidate) {
                        numUnprocessedWriteIns += 1
                        numExcludedWriteIns += 1
                    } else if (writeInCandidate.approved) {
                        const wcId = makeWriteInCandidateId(writeInCandidate.candidate_name)
                        if (!(wcId in marks)) {
                            marks[wcId] = score.score
                        }
                    } else {
                        numExcludedWriteIns += 1
                    }
                }
            })
            cvr.push({
                marks,
                overvote_rank: vote?.overvote_rank,
                has_duplicate_rank: vote?.has_duplicate_rank,
            })
        }
    })

    return { candidates, cvr, numUnprocessedWriteIns, numExcludedWriteIns }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

async function* asStream(ballots: BallotVotes[]): AsyncIterableIterator<BallotVotes> {
    for (const ballot of ballots) yield ballot;
}

const makeRace = (overrides: Partial<Race> & {race_id: string, voting_method: VotingMethod, candidateNames: string[]}): Race => ({
    race_id: overrides.race_id,
    title: overrides.race_id,
    voting_method: overrides.voting_method,
    num_winners: overrides.num_winners ?? 1,
    candidates: overrides.candidateNames.map(name => ({candidate_id: `c-${name}`, candidate_name: name} as Candidate)),
    enable_write_in: overrides.enable_write_in,
    write_in_candidates: overrides.write_in_candidates,
} as Race);

// Deterministic RNG so a failure is always reproducible. This is the same
// generator the production tiebreak shuffler uses, so there's one seeded RNG
// in the backend rather than a hand-rolled second one here.
const makeRand = (seed: number) => {
    const gen = getTinyRand(0, seed);
    return {
        next: () => gen._get() / 0x100000000,
        shuffled: <T,>(items: T[]): T[] => {
            const copy = [...items];
            gen.shuffle(copy);
            return copy;
        },
    };
};

/**
 * Generates ballots that exercise every edge case the projection has to
 * preserve: null marks, omitted candidates, scores out of candidate order,
 * duplicate scores, write-ins (approved / unapproved / unrecognized / aliased),
 * overvote_rank, has_duplicate_rank, skipped ranks, and ballots that skip the
 * race entirely.
 */
const generateBallots = (race: Race, count: number, seed: number): BallotVotes[] => {
    const {next: rand, shuffled} = makeRand(seed);
    const maxMark = ['IRV', 'STV', 'RankedRobin'].includes(race.voting_method) ? race.candidates.length
        : ['Approval', 'Plurality'].includes(race.voting_method) ? 1 : 5;
    const ballots: BallotVotes[] = [];

    for (let b = 0; b < count; b++) {
        // ~8% of ballots never voted in this race
        if (rand() < 0.08) {
            ballots.push({votes: [{race_id: 'some-other-race', scores: []}]});
            continue;
        }

        const scores: Score[] = [];
        race.candidates.forEach(c => {
            const roll = rand();
            if (roll < 0.1) return;                                     // candidate omitted entirely
            if (roll < 0.25) { scores.push({candidate_id: c.candidate_id, score: null}); return; }
            scores.push({candidate_id: c.candidate_id, score: Math.floor(rand() * (maxMark + 1))});
        });

        // out-of-bounds mark
        if (rand() < 0.05 && scores.length > 0) scores[0].score = maxMark + 3;
        // duplicate score for a candidate already marked
        if (rand() < 0.1 && scores.length > 0) scores.push({...scores[0], score: 2});

        if (race.enable_write_in) {
            const writeInNames = ['Charlie', '  charlie ', 'chuck', 'Dana', 'Nobody At All'];
            const n = Math.floor(rand() * 3);
            for (let i = 0; i < n; i++) {
                const name = writeInNames[Math.floor(rand() * writeInNames.length)];
                scores.push({
                    candidate_id: makeWriteInCandidateId(name.trim()),
                    score: Math.floor(rand() * (maxMark + 1)),
                    write_in_name: name,
                });
            }
        }

        const vote: Vote = {race_id: race.race_id, scores: shuffled(scores)};
        const overvoteRoll = rand();
        if (overvoteRoll < 0.1) vote.overvote_rank = 1 + Math.floor(rand() * maxMark);
        const duplicateRoll = rand();
        if (duplicateRoll < 0.1) vote.has_duplicate_rank = true;
        else if (duplicateRoll < 0.2) vote.has_duplicate_rank = false;
        // otherwise left undefined

        ballots.push({votes: [vote]});
    }
    return ballots;
};

const WRITE_INS = [
    {candidate_name: 'Charlie', aliases: ['charlie', 'chuck'], approved: true},
    {candidate_name: 'Dana', aliases: ['dana'], approved: false},
];

const SETTINGS = {max_rankings: 5} as ElectionSettings;

const compareProjection = async (race: Race, ballots: BallotVotes[]) => {
    const reference = referenceProjection(race, ballots);
    const [projection] = await projectBallots([race], asStream(ballots));

    expect(projection.candidates).toEqual(reference.candidates);
    expect(projection.numUnprocessedWriteIns).toBe(reference.numUnprocessedWriteIns);
    expect(projection.numExcludedWriteIns).toBe(reference.numExcludedWriteIns);
    expect(projection.count).toBe(reference.cvr.length);

    const cvr = projection.takeRawVotes();
    // toEqual ignores key insertion order, which the tabulators are also
    // insensitive to (they only ever read marks by candidate id, or reduce over
    // all of them with order-independent operations)
    expect(cvr).toEqual(reference.cvr);
    return {reference, cvr, candidates: projection.candidates};
};

const compareTabulation = async (race: Race, ballots: BallotVotes[]) => {
    const {reference, cvr, candidates} = await compareProjection(race, ballots);
    const tabulate = VotingMethods[race.voting_method];
    const expected = tabulate(reference.candidates, reference.cvr, race.num_winners, SETTINGS);
    const actual = tabulate(candidates, cvr, race.num_winners, SETTINGS);
    expect(JSON.stringify(actual)).toEqual(JSON.stringify(expected));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BallotProjection matches the verbose projection", () => {
    const methods: VotingMethod[] = ['STAR', 'STAR_PR', 'Approval', 'Plurality', 'RankedRobin', 'IRV', 'STV'];

    methods.forEach(voting_method => {
        test(`${voting_method}: plain race`, async () => {
            const race = makeRace({race_id: 'r0', voting_method, candidateNames: ['Allison', 'Bill', 'Carmen', 'Doug'], num_winners: voting_method === 'STV' || voting_method === 'STAR_PR' ? 2 : 1});
            await compareTabulation(race, generateBallots(race, 200, 11));
        });

        test(`${voting_method}: with write-ins`, async () => {
            const race = makeRace({
                race_id: 'r0',
                voting_method,
                candidateNames: ['Allison', 'Bill', 'Carmen'],
                num_winners: voting_method === 'STV' || voting_method === 'STAR_PR' ? 2 : 1,
                enable_write_in: true,
                write_in_candidates: WRITE_INS,
            });
            await compareTabulation(race, generateBallots(race, 200, 23));
        });
    });

    test("multi-race ballots project independently", async () => {
        const races = [
            makeRace({race_id: 'r0', voting_method: 'STAR', candidateNames: ['Allison', 'Bill']}),
            makeRace({race_id: 'r1', voting_method: 'IRV', candidateNames: ['Carmen', 'Doug', 'Elle']}),
            makeRace({race_id: 'r2', voting_method: 'Approval', candidateNames: ['Frank', 'Gina'], enable_write_in: true, write_in_candidates: WRITE_INS}),
        ];
        // each ballot votes in a different subset of the races
        const perRace = races.map((race, i) => generateBallots(race, 120, 31 + i));
        const ballots: BallotVotes[] = perRace[0].map((_, i) => ({
            votes: races.flatMap((race, r) => perRace[r][i].votes.filter(v => v.race_id === race.race_id))
        }));

        const projections = await projectBallots(races, asStream(ballots));
        races.forEach((race, r) => {
            const reference = referenceProjection(race, ballots);
            expect(projections[r].candidates).toEqual(reference.candidates);
            expect(projections[r].numUnprocessedWriteIns).toBe(reference.numUnprocessedWriteIns);
            expect(projections[r].numExcludedWriteIns).toBe(reference.numExcludedWriteIns);
            expect(projections[r].takeRawVotes()).toEqual(reference.cvr);
        });
    });

    test("a candidate the ballot never mentions stays absent, not zero", async () => {
        // This is the case that makes null and undefined marks non-interchangeable:
        // STAR treats an all-equal ballot as an abstention, and a ballot that
        // omits the approved write-in must not gain an implicit 0 for them.
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'STAR',
            candidateNames: ['Allison', 'Bill'],
            enable_write_in: true,
            write_in_candidates: WRITE_INS,
        });
        const ballots: BallotVotes[] = [
            {votes: [{race_id: 'r0', scores: [
                {candidate_id: 'c-Allison', score: 5},
                {candidate_id: 'c-Bill', score: 5},
            ]}]},
            {votes: [{race_id: 'r0', scores: [
                {candidate_id: 'c-Allison', score: 5},
                {candidate_id: 'c-Bill', score: 1},
                {candidate_id: makeWriteInCandidateId('Charlie'), score: 3, write_in_name: 'Charlie'},
            ]}]},
        ];
        const {cvr} = await compareProjection(race, ballots);
        expect(cvr[0].marks).toEqual({'c-Allison': 5, 'c-Bill': 5});
        expect(makeWriteInCandidateId('Charlie') in cvr[0].marks).toBe(false);
        await compareTabulation(race, ballots);
    });

    test("duplicate scores keep the first, for both regular and write-in candidates", async () => {
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'STAR',
            candidateNames: ['Allison', 'Bill'],
            enable_write_in: true,
            write_in_candidates: WRITE_INS,
        });
        const warnings: string[] = [];
        const ballots: BallotVotes[] = [
            {votes: [{race_id: 'r0', scores: [
                {candidate_id: 'c-Allison', score: 4},
                {candidate_id: 'c-Allison', score: 1},
                {candidate_id: 'c-Bill', score: null},
                {candidate_id: 'c-Bill', score: 5},
                {candidate_id: 'cwi-x', score: 2, write_in_name: 'chuck'},
                {candidate_id: 'cwi-y', score: 5, write_in_name: 'Charlie'},
            ]}]},
        ];
        const [projection] = await projectBallots([race], asStream(ballots), {warn: (m) => warnings.push(m)});
        expect(projection.takeRawVotes()[0].marks).toEqual({
            'c-Allison': 4,
            'c-Bill': null,
            [makeWriteInCandidateId('Charlie')]: 2,
        });
        expect(warnings).toEqual([
            '[Tabulation] Duplicate score for candidate "c-Allison" on same ballot, keeping first score',
            '[Tabulation] Duplicate score for candidate "c-Bill" on same ballot, keeping first score',
            '[WriteIn] Duplicate write-in score for "Charlie" on same ballot, keeping first score',
        ]);
    });

    test("write-in aliases, unapproved write-ins and unrecognized names are counted the old way", async () => {
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'Approval',
            candidateNames: ['Allison'],
            enable_write_in: true,
            write_in_candidates: WRITE_INS,
        });
        const ballots: BallotVotes[] = [
            // alias match (trimmed + lowercased) onto the approved write-in
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'x', score: 1, write_in_name: '  CHUCK '}]}]},
            // matched but unapproved -> excluded only
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'x', score: 1, write_in_name: 'Dana'}]}]},
            // unmatched -> unprocessed and excluded
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'x', score: 1, write_in_name: 'Nobody At All'}]}]},
            // write_in_name absent -> silently dropped, no diagnostics
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'cwi-Charlie', score: 1}]}]},
        ];
        const {reference, cvr} = await compareProjection(race, ballots);
        expect(reference.numUnprocessedWriteIns).toBe(1);
        expect(reference.numExcludedWriteIns).toBe(2);
        expect(cvr[0].marks).toEqual({[makeWriteInCandidateId('Charlie')]: 1});
        expect(cvr[3].marks).toEqual({});
    });

    test("when two write-in candidates share an alias, the first one still wins", async () => {
        // the old code resolved aliases with writeInCandidates.find(...), so the
        // earlier entry won; an alias index has to preserve that
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'Approval',
            candidateNames: ['Allison'],
            enable_write_in: true,
            write_in_candidates: [
                {candidate_name: 'Charlie', aliases: ['chuck'], approved: true},
                {candidate_name: 'Chuck Jones', aliases: ['chuck'], approved: true},
            ],
        });
        const ballots: BallotVotes[] = [
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'x', score: 1, write_in_name: 'Chuck'}]}]},
        ];
        const {cvr} = await compareProjection(race, ballots);
        expect(cvr[0].marks).toEqual({[makeWriteInCandidateId('Charlie')]: 1});
    });

    test("an unapproved write-in listed before an approved one still shadows it", async () => {
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'Approval',
            candidateNames: ['Allison'],
            enable_write_in: true,
            write_in_candidates: [
                {candidate_name: 'Dana', aliases: ['chuck'], approved: false},
                {candidate_name: 'Charlie', aliases: ['chuck'], approved: true},
            ],
        });
        const ballots: BallotVotes[] = [
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'x', score: 1, write_in_name: 'chuck'}]}]},
        ];
        const {reference, cvr} = await compareProjection(race, ballots);
        expect(cvr[0].marks).toEqual({});
        expect(reference.numExcludedWriteIns).toBe(1);
        expect(reference.numUnprocessedWriteIns).toBe(0);
    });

    test("write-ins are ignored when the race has no write-in list", async () => {
        // enable_write_in without write_in_candidates: every write-in is unprocessed
        const race = makeRace({race_id: 'r0', voting_method: 'STAR', candidateNames: ['Allison'], enable_write_in: true});
        const ballots: BallotVotes[] = [
            {votes: [{race_id: 'r0', scores: [
                {candidate_id: 'c-Allison', score: 3},
                {candidate_id: 'x', score: 5, write_in_name: 'Charlie'},
            ]}]},
        ];
        const {reference} = await compareProjection(race, ballots);
        expect(reference.numUnprocessedWriteIns).toBe(1);
    });

    test("overvote_rank and has_duplicate_rank round-trip, including when unset", async () => {
        const race = makeRace({race_id: 'r0', voting_method: 'IRV', candidateNames: ['Allison', 'Bill', 'Carmen']});
        const ballots: BallotVotes[] = [
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'c-Allison', score: 1}], overvote_rank: 2, has_duplicate_rank: true}]},
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'c-Allison', score: 1}], has_duplicate_rank: false}]},
            // skipped rankings, nothing set
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'c-Allison', score: 1}, {candidate_id: 'c-Bill', score: null}, {candidate_id: 'c-Carmen', score: 3}]}]},
        ];
        const {cvr} = await compareProjection(race, ballots);
        expect(cvr[0].overvote_rank).toBe(2);
        expect(cvr[0].has_duplicate_rank).toBe(true);
        expect(cvr[1].overvote_rank).toBeUndefined();
        expect(cvr[1].has_duplicate_rank).toBe(false);
        expect(cvr[2].overvote_rank).toBeUndefined();
        expect(cvr[2].has_duplicate_rank).toBeUndefined();
        await compareTabulation(race, ballots);
    });

    test("a race with no candidates projects empty ballots", async () => {
        const race = makeRace({race_id: 'r0', voting_method: 'STAR', candidateNames: []});
        const ballots: BallotVotes[] = [
            {votes: [{race_id: 'r0', scores: [{candidate_id: 'c-Ghost', score: 5}]}]},
        ];
        const {cvr} = await compareProjection(race, ballots);
        expect(cvr).toEqual([{marks: {}, overvote_rank: undefined, has_duplicate_rank: undefined}]);
    });

    test("marks stay correct across block boundaries", async () => {
        // the store keeps marks in BLOCK_BALLOTS-sized blocks and frees each one
        // as it's consumed, so the block seam is exactly where an indexing
        // mistake would put a ballot's marks on the wrong ballot
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'STAR',
            candidateNames: ['Allison', 'Bill', 'Carmen'],
            enable_write_in: true,
            write_in_candidates: WRITE_INS,
        });
        // generated with slack: some of these ballots skip the race entirely, and
        // it's the ballots that reach the store that have to span three blocks
        const ballots = generateBallots(race, BLOCK_BALLOTS * 3, 55);
        const {cvr} = await compareProjection(race, ballots);
        expect(cvr.length).toBeGreaterThan(BLOCK_BALLOTS * 2);
    });

    test("no ballot is lost at a block boundary, at any stream length", async () => {
        // The store's last block is almost always partial, so "the stream ended
        // mid-block" is the normal case rather than an edge case. takeRawVotes
        // pre-sizes the output with `new Array(store.count)` and fills by index,
        // which means a skipped ballot leaves a hole rather than a short array —
        // cvr.length alone would not notice. Check the contents at every count
        // straddling a block seam, plus the degenerate small ones.
        const race = makeRace({race_id: 'r0', voting_method: 'STAR', candidateNames: ['Allison', 'Bill', 'Carmen']});
        const counts = new Set([0, 1, 2, 3]);
        for (const k of [1, 2, 3]) for (const d of [-2, -1, 0, 1, 2]) counts.add(BLOCK_BALLOTS * k + d);

        for (const n of [...counts].sort((a, b) => a - b)) {
            // every ballot marked distinctly so a dropped or duplicated one shows up
            const ballots: BallotVotes[] = Array.from({length: n}, (_, i) => ({
                votes: [{
                    race_id: 'r0',
                    scores: [
                        {candidate_id: 'c-Allison', score: i % 6},
                        {candidate_id: 'c-Bill', score: (i + 2) % 6},
                        {candidate_id: 'c-Carmen', score: (i + 4) % 6},
                    ],
                    overvote_rank: i % 7 === 0 ? (i % 5) + 1 : undefined,
                }],
            }));
            const [projection] = await projectBallots([race], asStream(ballots));
            expect(projection.count).toBe(n);
            const cvr = projection.takeRawVotes();
            expect(cvr.length).toBe(n);
            // scanned by hand rather than with a per-ballot expect: at three
            // blocks that would be ~100k matcher calls and dominate the suite
            const problems: string[] = [];
            for (let i = 0; i < n && problems.length < 3; i++) {
                const got = cvr[i];
                if (got === undefined) { problems.push(`cvr[${i}] is a hole`); continue; }
                const wantMarks = {'c-Allison': i % 6, 'c-Bill': (i + 2) % 6, 'c-Carmen': (i + 4) % 6};
                if (JSON.stringify(got.marks) !== JSON.stringify(wantMarks)) problems.push(`cvr[${i}].marks = ${JSON.stringify(got.marks)}`);
                const wantRank = i % 7 === 0 ? (i % 5) + 1 : undefined;
                if (got.overvote_rank !== wantRank) problems.push(`cvr[${i}].overvote_rank = ${got.overvote_rank}, want ${wantRank}`);
            }
            expect(`n=${n}: ${problems.join('; ')}`).toBe(`n=${n}: `);
        }
    });

    test("shuffling the candidate list doesn't disturb the projection", async () => {
        // getElectionResultsController hands `candidates` to
        // shuffleCandidatesForRandomTiebreak, which sorts it in place. If the
        // store's positional order were read off that array rather than the
        // snapshot, every ballot's marks would land on the wrong candidate —
        // and nothing about the results would look obviously wrong.
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'STAR',
            candidateNames: ['Allison', 'Bill', 'Carmen', 'Doug', 'Elle'],
            enable_write_in: true,
            write_in_candidates: WRITE_INS,
        });
        const ballots = generateBallots(race, 200, 77);
        const reference = referenceProjection(race, ballots);

        const [projection] = await projectBallots([race], asStream(ballots));
        shuffleCandidatesForRandomTiebreak(new Date(), projection.candidates, projection.count, race.race_id);
        expect(projection.candidates.map(c => c.id)).not.toEqual(projection.candidateIds);
        expect(projection.takeRawVotes()).toEqual(reference.cvr);
    });

    test("takeRawVotes releases the compact store", async () => {
        const race = makeRace({race_id: 'r0', voting_method: 'STAR', candidateNames: ['Allison']});
        const ballots = generateBallots(race, 5, 7);
        const [projection] = await projectBallots([race], asStream(ballots));
        const count = projection.count;
        expect(projection.takeRawVotes().length).toBe(count);
        // the buffers are gone; expanding again would read zeroed memory, so it
        // fails loudly rather than quietly producing a second, wrong cvr
        expect(() => projection.takeRawVotes()).toThrow(/released/);
        expect(projection.count).toBe(count);
    });

    test("the store holds exactly the shared OrderedVote layout", async () => {
        // the compact store is the OrderedVote layout unrolled into typed arrays,
        // so decoding it with the shared codec must reproduce the ballots
        const race = makeRace({
            race_id: 'r0',
            voting_method: 'STAR',
            candidateNames: ['Allison', 'Bill', 'Carmen'],
            enable_write_in: true,
            write_in_candidates: WRITE_INS,
        });
        const ballots = generateBallots(race, 50, 91);
        const [projection] = await projectBallots([race], asStream(ballots));
        const order = projection.candidateOrder;
        const decoded = Array.from({length: projection.count}, (_, i) =>
            orderedVotesToVotes([projection.store.toOrderedVote(i)], [order])[0]);

        const cvr = projection.takeRawVotes();
        decoded.forEach((vote, i) => {
            // a score of undefined is the codec's way of saying "no entry", which is
            // exactly the key rawVote leaves out
            const marks = Object.fromEntries(
                vote.scores.filter(s => s.score !== undefined).map(s => [s.candidate_id, s.score])
            );
            expect(marks).toEqual(cvr[i].marks);
            expect(vote.overvote_rank).toEqual(cvr[i].overvote_rank);
            expect(vote.has_duplicate_rank).toEqual(cvr[i].has_duplicate_rank);
        });
    });
});
