import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { DevElectionDefinition, devBallotId } from '../types';
import { devElectionId } from '@equal-vote/star-vote-shared/utils/makeID';

const ELECTION_ID = devElectionId('starprordering');
const RACE_ID = 'devteststarprordering_race0';

// AllocatedScore (STAR_PR) does not sort summaryData.candidates — the frontend
// receives them in this input order. VoterProfileWidget defaults Left/Right to
// summaryData.candidates[0..1], so on this race it picks Anchovy vs. Brussels
// Sprouts (both losers) instead of the actual elected pair (Carrot, Eggplant).
const candidates = [
    { candidate_id: 'anchovy', candidate_name: 'Anchovy' },
    { candidate_id: 'brussels', candidate_name: 'Brussels Sprouts' },
    { candidate_id: 'carrot', candidate_name: 'Carrot' },
    { candidate_id: 'durian', candidate_name: 'Durian' },
    { candidate_id: 'eggplant', candidate_name: 'Eggplant' },
];

const election: Election = {
    election_id: ELECTION_ID,
    title: 'Dev Test: STAR_PR Candidate Ordering',
    description: 'Demonstrates that STAR_PR returns summaryData.candidates in the input order rather than by any metric. VoterProfileWidget therefore shows a head-to-head between Anchovy and Brussels Sprouts — the first two candidates in input order, both losers — even though the actual elected winners are Carrot and Eggplant.',
    frontend_url: '',
    owner_id: '7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3', // PlayWrightTest user from dev-realm.json
    state: 'open',
    races: [
        {
            race_id: RACE_ID,
            title: 'Favorite Vegetable',
            voting_method: 'STAR_PR',
            num_winners: 2,
            candidates: candidates,
        },
    ],
    settings: {
        voter_access: 'open',
        voter_authentication: { voter_id: true },
        ballot_updates: false,
        public_results: true,
        random_candidate_order: false,
        require_instruction_confirmation: true,
        term_type: 'poll',
    },
    create_date: new Date().toISOString(),
    update_date: Date.now().toString(),
    head: true,
    ballot_source: 'live_election',
};

// 10 ballots — scores ordered as [Anchovy, Brussels, Carrot, Durian, Eggplant].
//
// Total stars: Anchovy=3, Brussels=30, Carrot=47, Durian=3, Eggplant=43.
// Carrot wins round 1; Eggplant wins round 2 after weight redistribution.
// Brussels has noticeable support but never reaches a quota; Anchovy is
// essentially ignored. Yet [Anchovy, Brussels] are at indices [0, 1] of the
// (unsorted) summaryData.candidates that the frontend receives.
const ballotPatterns: number[][] = [
    [0, 3, 5, 0, 4],
    [0, 3, 5, 0, 4],
    [0, 3, 5, 0, 4],
    [0, 3, 5, 0, 4],
    [1, 2, 5, 0, 4],
    [1, 2, 5, 0, 4],
    [1, 2, 5, 0, 4],
    [0, 4, 4, 1, 5],
    [0, 4, 4, 1, 5],
    [0, 4, 4, 1, 5],
];

function makeBallots(): Ballot[] {
    return ballotPatterns.map((scores, i) => ({
        ballot_id: devBallotId(ELECTION_ID, i),
        election_id: ELECTION_ID,
        status: 'submitted',
        date_submitted: Date.now(),
        votes: [
            {
                race_id: RACE_ID,
                scores: candidates.map((c, j) => ({
                    candidate_id: c.candidate_id,
                    score: scores[j],
                })),
            },
        ],
        create_date: new Date().toISOString(),
        update_date: Date.now().toString(),
        head: true,
    }));
}

const definition: DevElectionDefinition = {
    electionId: ELECTION_ID,
    election,
    makeBallots,
};

export default definition;
