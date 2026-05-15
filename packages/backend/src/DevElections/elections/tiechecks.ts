import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { DevElectionDefinition, devBallotId } from '../types';
import { devElectionId } from '@equal-vote/star-vote-shared/utils/makeID';

const ELECTION_ID = devElectionId('tiechecks');
const RACE_ID = 'devtesttiechecks_race0';

const candidates = [
    { candidate_id: 'watermelon', candidate_name: 'Watermelon' },
    { candidate_id: 'greenapple', candidate_name: 'Green Apple' },
    { candidate_id: 'blueraspberry', candidate_name: 'Blue Raspberry' },
    { candidate_id: 'grape', candidate_name: 'Grape' },
    { candidate_id: 'cherry', candidate_name: 'Cherry' },
];

const election: Election = {
    election_id: ELECTION_ID,
    title: 'Dev Test: STAR Tiebreakers (Score + Head-to-Head + Five-Star)',
    description: 'A dev test election that exercises STAR tiebreakers. Watermelon leads with 26 stars; Green Apple and Blue Raspberry tie at 24. Their head-to-head is also tied, so the five-star tiebreaker decides — Blue Raspberry advances to the runoff with Watermelon.',
    frontend_url: '',
    owner_id: '7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3', // PlayWrightTest user from dev-realm.json
    state: 'open',
    races: [
        {
            race_id: RACE_ID,
            title: 'Favorite Fruit',
            voting_method: 'STAR',
            num_winners: 1,
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

// 6 ballots — scores ordered as [Watermelon, Green Apple, Blue Raspberry, Grape, Cherry]
//
// Totals: Watermelon = 26, Green Apple = 24, Blue Raspberry = 24, Grape = 0, Cherry = 0
//   → Watermelon advances; GA and BR are score-tied for second.
// Green Apple vs Blue Raspberry head-to-head: 2 wins each (V3,V4 for BR; V5,V6 for GA),
//   plus 2 equal-score ballots (V1,V2) → head-to-head tied.
// Five-star counts: Blue Raspberry = 4, Green Apple = 2 → Blue Raspberry advances on the
//   five-star tiebreaker.
const ballotPatterns: number[][] = [
    [5, 5, 5, 0, 0],
    [5, 5, 5, 0, 0],
    [5, 4, 5, 0, 0],
    [5, 4, 5, 0, 0],
    [3, 3, 2, 0, 0],
    [3, 3, 2, 0, 0],
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
