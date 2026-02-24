import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { DevElectionDefinition, devBallotId } from '../types';

const ELECTION_ID = 'devtestwizardstar';
const RACE_ID = 'devtestwizardstar_race0';

const candidates = [
    { candidate_id: 'apple', candidate_name: 'Apple' },
    { candidate_id: 'banana', candidate_name: 'Banana' },
    { candidate_id: 'cabbage', candidate_name: 'Cabbage' },
    { candidate_id: 'dinokale', candidate_name: 'Dino Kale' },
];

const election: Election = {
    election_id: ELECTION_ID,
    title: 'Dev Test: Single Winner STAR (Wizard Style)',
    description: 'A dev test election mimicking what the wizard creates for a single winner STAR election.',
    frontend_url: '',
    owner_id: '7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3', // PlayWrightTest user from dev-realm.json
    state: 'open',
    races: [
        {
            race_id: RACE_ID,
            title: 'Favorite Produce',
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
        random_candidate_order: true,
        require_instruction_confirmation: true,
        term_type: 'poll',
    },
    create_date: new Date().toISOString(),
    update_date: Date.now().toString(),
    head: true,
    ballot_source: 'live_election',
};

// 6 ballots with distinct voting patterns for STAR (scores 0-5)
const ballotPatterns: number[][] = [
    // [Apple, Banana, Cabbage, Dino Kale]
    [5, 3, 1, 0],  // Strong Apple supporter
    [2, 5, 4, 2],  // Banana fan, likes Cabbage
    [1, 1, 5, 4],  // Greens lover (Cabbage > Dino Kale)
    [4, 4, 2, 5],  // Likes Dino Kale best, also likes Apple & Banana
    [3, 0, 2, 2],  // Moderate, dislikes Banana
    [1, 2, 0, 5],  // Strong Dino Kale supporter
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
