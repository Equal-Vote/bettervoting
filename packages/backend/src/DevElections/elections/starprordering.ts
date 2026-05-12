import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { DevElectionDefinition, devBallotId } from '../types';
import { devElectionId } from '@equal-vote/star-vote-shared/utils/makeID';

const ELECTION_ID = devElectionId('starprordering');
const RACE_ID = 'devteststarprordering_race0';

// AllocatedScore (STAR_PR) reorders summaryData.candidates at the end of
// tabulation: elected first in election order, then non-elected by
// final-round weighted score (descending). On this race the input order is
// [Anchovy, Brussels, Carrot, Durian, Eggplant] but the result should come
// back ordered roughly [Carrot, Eggplant, Brussels, Durian, Anchovy].
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
    description: 'Regression fixture for STAR_PR candidate ordering. Candidates are submitted in alphabetical input order [Anchovy, Brussels, Carrot, Durian, Eggplant]; Carrot and Eggplant are elected (in that order). The result should come back with winners first (Carrot, Eggplant) followed by non-elected sorted by final-round weighted score descending — historically AllocatedScore left summaryData.candidates in input order.',
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
// essentially ignored. With the backend reorder, summaryData.candidates
// should now lead with [Carrot, Eggplant, ...] instead of [Anchovy, Brussels, ...].
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
