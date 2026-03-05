import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { DevElectionDefinition, devBallotId } from '../types';
import { devElectionId } from '@equal-vote/star-vote-shared/utils/makeID';

const ELECTION_ID = devElectionId('writeins');
const RACE_SINGLE = 'devtestwriteins_race0';
const RACE_MULTI = 'devtestwriteins_race1';

const singleWinnerCandidates = [
    { candidate_id: 'alice', candidate_name: 'Alice' },
    { candidate_id: 'bob', candidate_name: 'Bob' },
];

const multiWinnerCandidates = [
    { candidate_id: 'red', candidate_name: 'Red' },
    { candidate_id: 'green', candidate_name: 'Green' },
    { candidate_id: 'blue', candidate_name: 'Blue' },
];

const election: Election = {
    election_id: ELECTION_ID,
    title: 'Dev Test: Write-In Candidates',
    description: 'A dev test election with write-in candidates enabled. Two races: single-winner STAR and multi-winner STAR_PR.',
    frontend_url: '',
    owner_id: '7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3',
    state: 'open',
    races: [
        {
            race_id: RACE_SINGLE,
            title: 'Best Leader',
            voting_method: 'STAR',
            num_winners: 1,
            candidates: singleWinnerCandidates,
            enable_write_in: true,
        },
        {
            race_id: RACE_MULTI,
            title: 'Color Committee (pick 2)',
            voting_method: 'STAR_PR',
            num_winners: 2,
            candidates: multiWinnerCandidates,
            enable_write_in: true,
        },
    ],
    settings: {
        voter_access: 'open',
        voter_authentication: { voter_id: true },
        ballot_updates: false,
        public_results: true,
        random_candidate_order: false,
        require_instruction_confirmation: false,
        term_type: 'election',
    },
    create_date: new Date().toISOString(),
    update_date: Date.now().toString(),
    head: true,
    ballot_source: 'live_election',
};

function makeBallots(): Ballot[] {
    const ballots: Ballot[] = [
        // Ballot 0: no write-ins, just official candidates
        {
            ballot_id: devBallotId(ELECTION_ID, 0),
            election_id: ELECTION_ID,
            status: 'submitted',
            date_submitted: Date.now(),
            votes: [
                {
                    race_id: RACE_SINGLE,
                    scores: [
                        { candidate_id: 'alice', score: 5 },
                        { candidate_id: 'bob', score: 2 },
                    ],
                },
                {
                    race_id: RACE_MULTI,
                    scores: [
                        { candidate_id: 'red', score: 4 },
                        { candidate_id: 'green', score: 3 },
                        { candidate_id: 'blue', score: 1 },
                    ],
                },
            ],
            create_date: new Date().toISOString(),
            update_date: Date.now().toString(),
            head: true,
        },

        // Ballot 1: one write-in per race
        {
            ballot_id: devBallotId(ELECTION_ID, 1),
            election_id: ELECTION_ID,
            status: 'submitted',
            date_submitted: Date.now(),
            votes: [
                {
                    race_id: RACE_SINGLE,
                    scores: [
                        { candidate_id: 'alice', score: 1 },
                        { candidate_id: 'bob', score: 3 },
                        { candidate_id: 'write_in_Charlie', score: 5, write_in_name: 'Charlie' },
                    ],
                },
                {
                    race_id: RACE_MULTI,
                    scores: [
                        { candidate_id: 'red', score: 0 },
                        { candidate_id: 'green', score: 5 },
                        { candidate_id: 'blue', score: 2 },
                        { candidate_id: 'write_in_Purple', score: 4, write_in_name: 'Purple' },
                    ],
                },
            ],
            create_date: new Date().toISOString(),
            update_date: Date.now().toString(),
            head: true,
        },

        // Ballot 2: two write-ins in the single-winner race, one in multi-winner
        {
            ballot_id: devBallotId(ELECTION_ID, 2),
            election_id: ELECTION_ID,
            status: 'submitted',
            date_submitted: Date.now(),
            votes: [
                {
                    race_id: RACE_SINGLE,
                    scores: [
                        { candidate_id: 'alice', score: 0 },
                        { candidate_id: 'bob', score: 1 },
                        { candidate_id: 'write_in_Charlie', score: 4, write_in_name: 'Charlie' },
                        { candidate_id: 'write_in_Dana', score: 5, write_in_name: 'Dana' },
                    ],
                },
                {
                    race_id: RACE_MULTI,
                    scores: [
                        { candidate_id: 'red', score: 5 },
                        { candidate_id: 'green', score: 0 },
                        { candidate_id: 'blue', score: 3 },
                        { candidate_id: 'write_in_Orange', score: 4, write_in_name: 'Orange' },
                    ],
                },
            ],
            create_date: new Date().toISOString(),
            update_date: Date.now().toString(),
            head: true,
        },

        // Ballot 3: two write-ins in multi-winner race, same Charlie write-in in single-winner
        {
            ballot_id: devBallotId(ELECTION_ID, 3),
            election_id: ELECTION_ID,
            status: 'submitted',
            date_submitted: Date.now(),
            votes: [
                {
                    race_id: RACE_SINGLE,
                    scores: [
                        { candidate_id: 'alice', score: 3 },
                        { candidate_id: 'bob', score: 0 },
                        { candidate_id: 'write_in_Charlie', score: 4, write_in_name: 'Charlie' },
                    ],
                },
                {
                    race_id: RACE_MULTI,
                    scores: [
                        { candidate_id: 'red', score: 1 },
                        { candidate_id: 'green', score: 2 },
                        { candidate_id: 'blue', score: 0 },
                        { candidate_id: 'write_in_Purple', score: 5, write_in_name: 'Purple' },
                        { candidate_id: 'write_in_Orange', score: 3, write_in_name: 'Orange' },
                    ],
                },
            ],
            create_date: new Date().toISOString(),
            update_date: Date.now().toString(),
            head: true,
        },

        // Ballot 4: no write-ins, different scoring pattern
        {
            ballot_id: devBallotId(ELECTION_ID, 4),
            election_id: ELECTION_ID,
            status: 'submitted',
            date_submitted: Date.now(),
            votes: [
                {
                    race_id: RACE_SINGLE,
                    scores: [
                        { candidate_id: 'alice', score: 4 },
                        { candidate_id: 'bob', score: 4 },
                    ],
                },
                {
                    race_id: RACE_MULTI,
                    scores: [
                        { candidate_id: 'red', score: 2 },
                        { candidate_id: 'green', score: 5 },
                        { candidate_id: 'blue', score: 5 },
                    ],
                },
            ],
            create_date: new Date().toISOString(),
            update_date: Date.now().toString(),
            head: true,
        },
    ];

    return ballots;
}

const definition: DevElectionDefinition = {
    electionId: ELECTION_ID,
    election,
    makeBallots,
};

export default definition;
