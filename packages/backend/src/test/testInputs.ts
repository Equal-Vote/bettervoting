
import { NewBallot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ElectionSettings } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { Race } from '@equal-vote/star-vote-shared/domain_model/Race';
import jwt from "jsonwebtoken";


export default {
    user1token : jwt.sign({ 
        email: 'Alice@email.com',
        sub: 'Alice1234',
    
    }, "privateKey"),
    
    user2token : jwt.sign({ 
        email: 'Bob@email.com',
        sub: 'Bob2345',
    
    }, "privateKey"),

    user3token : jwt.sign({ 
        email: 'Carl@email.com',
        sub: 'Carl3456',
    
    }, "privateKey"),

    user4tempId: 'tempDanny4567',
    
    Election1 : {
        election_id: "0",
        title: 'Election 1',
        state: 'draft',
        frontend_url: '',
        owner_id: 'Alice1234',
        races: [] as Race[],
        settings: {
           voter_access: 'open',
           voter_authentication: {ip_address: true},
        } as ElectionSettings
    } as Election,

    TempElection : {
        election_id: "0",
        title: 'Quick Poll Election',
        state: 'open',
        frontend_url: '',
        owner_id: 'tempDanny4567',
        races: [] as Race[],
        settings: {
           voter_access: 'open',
           voter_authentication: {ip_address: true},
        } as ElectionSettings
    } as Election,

    IncompleteElection : {
        election_id: "0",
        title: 'Election 1',
        state: 'draft',
        frontend_url: '',
        owner_id: '0',
    } as Election,
    
    // Type 2: closed + voter_id + invitation=email (bv-managed email list).
    // Voters are pre-listed by email; finalize/sendInvites assigns voter_ids and emails them.
    EmailRollElection : {
        election_id: "0",
        title: 'Election 1',
        state: 'open',
        frontend_url: '',
        owner_id: 'Alice1234',
        credential_ids: ['Alice@email.com'],
        races: [
            {
                race_id: '0',
                title:'Race 0',
                num_winners: 1,
                voting_method:'STAR',
                candidates:[
                    {
                        candidate_id:'0',
                        candidate_name: 'A',
                    },
                    {
                        candidate_id:'1',
                        candidate_name: 'B',
                    },
                    {
                        candidate_id:'2',
                        candidate_name: 'C',
                    }
                ]
            }
        ] as Race[],
        settings: {
            voter_access: 'closed',
            voter_authentication: {voter_id: true},
            invitation: 'email',
        } as ElectionSettings
    } as Election,

    // Type 3: open + email (anyone with a verified email may vote, deduped by email).
    // Used by tests that exercise email-based voter matching against the roll.
    OpenEmailElection : {
        election_id: "0",
        title: 'Election 1',
        state: 'open',
        frontend_url: '',
        owner_id: 'Alice1234',
        credential_ids: ['Alice@email.com'],
        races: [
            {
                race_id: '0',
                title:'Race 0',
                num_winners: 1,
                voting_method:'STAR',
                candidates:[
                    {
                        candidate_id:'0',
                        candidate_name: 'A',
                    },
                    {
                        candidate_id:'1',
                        candidate_name: 'B',
                    },
                    {
                        candidate_id:'2',
                        candidate_name: 'C',
                    }
                ]
            }
        ] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: {email: true},
        } as ElectionSettings
    } as Election,

    EmailRoll:[
        { 
            email:'Alice@email.com',
        },
        {
            email:'Bob@email.com',
        }
    ],
    Ballot1: {
        ballot_id: "0",
        election_id: "7",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: 'A',
                score: 5,
            },
            {
                candidate_id: 'B',
                score: 0,

            },
            {
                candidate_id: 'C',
                score: 4,
            }
            ]
        }]
    } as NewBallot,

    IDRollElection : {
        election_id: "0",
        title: 'Election 1',
        state: 'open',
        frontend_url: '',
        owner_id: 'Alice1234',
        races: [
            {
                race_id: '0',
                title:'Race 0',
                num_winners: 1,
                voting_method:'STAR',
                candidates:[
                    {
                        candidate_id:'0',
                        candidate_name: 'A',
                    },
                    {
                        candidate_id:'1',
                        candidate_name: 'B',
                    },
                    {
                        candidate_id:'2',
                        candidate_name: 'C',
                    }
                ]
            }
        ] as Race[],
        settings: {
            voter_access: 'closed',
            voter_authentication: {voter_id: true},
        } as ElectionSettings
    } as Election,

    IDRoll:[
        { 
            voter_id:'AliceID',
        },
        { 
            voter_id:'BobID',
        },
    ],
    Ballot2: {
        ballot_id: "0",
        election_id: "8",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: 'A',
                score: 5,
            },
            {
                candidate_id: 'B',
                score: 0,

            },
            {
                candidate_id: 'C',
                score: 4,
            }
            ]
        }]
    } as NewBallot,
    MultiRaceElection : {
        election_id: "0",
        title: 'Election 1',
        state: 'open',
        frontend_url: '',
        owner_id: 'Alice1234',
        credential_ids: ['Alice@email.com'],
        races: [
            {
                race_id: '0',
                title:'Race 0',
                num_winners: 1,
                voting_method:'STAR',
                candidates:[
                    {
                        candidate_id:'0',
                        candidate_name: 'A',
                    },
                    {
                        candidate_id:'1',
                        candidate_name: 'B',
                    },
                    {
                        candidate_id:'2',
                        candidate_name: 'C',
                    }
                ]
            },
            {
                race_id: '1',
                title:'Race 1',
                num_winners: 1,
                voting_method:'STAR',
                candidates:[
                    {
                        candidate_id:'0',
                        candidate_name: 'D',
                    },
                    {
                        candidate_id:'1',
                        candidate_name: 'E',
                    },
                    {
                        candidate_id:'2',
                        candidate_name: 'F',
                    }
                ]
            }
        ] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: {},
        } as ElectionSettings
    } as Election,
    MultiRaceBallotValid1: {
        ballot_id: "0",
        election_id: "0",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: 'A',
                score: 5,
            },
            {
                candidate_id: 'B',
                score: 0,

            },
            {
                candidate_id: 'C',
                score: 4,
            }
            ]
        }]
    } as NewBallot,
    MultiRaceBallotValid2: {
        ballot_id: "1",
        election_id: "0",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        },
        {
            race_id:'1',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        }]
    } as NewBallot,
    MultiRaceBallotInvalid1: {
        ballot_id: "2",
        election_id: "0",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        },
        {
            race_id:'1',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        },
        {
            race_id:'1',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        }]
    } as NewBallot,
    MultiRaceBallotInvalid2: {
        ballot_id: "3",
        election_id: "0",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        },
        {
            race_id:'1',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        },
        {
            race_id:'2',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        }]
    } as NewBallot,

    
    PrecinctElection : {
        election_id: "0",
        title: 'Precinct Election',
        state: 'open',
        frontend_url: '',
        owner_id: 'Alice1234',
        credential_ids: ['Alice@email.com'],
        races: [
            {
                race_id: '0',
                title:'Race 0',
                num_winners: 1,
                voting_method:'STAR',
                candidates:[
                    {
                        candidate_id:'0',
                        candidate_name: 'A',
                    },
                    {
                        candidate_id:'1',
                        candidate_name: 'B',
                    },
                    {
                        candidate_id:'2',
                        candidate_name: 'C',
                    }
                ]
            },
            {
                race_id: '1',
                title:'Race 1',
                num_winners: 1,
                voting_method:'STAR',
                precincts: ['0'],
                candidates:[
                    {
                        candidate_id:'0',
                        candidate_name: 'D',
                    },
                    {
                        candidate_id:'1',
                        candidate_name: 'E',
                    },
                    {
                        candidate_id:'2',
                        candidate_name: 'F',
                    }
                ]
            }
        ] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: {email: true},
            voter_groups_enabled: true,
            voter_groups: ['0', '1'],
        } as ElectionSettings
    } as Election,
    // Three-race election used by voter-groups filtering tests (groups on).
    // Race 0: open to all (no precincts)
    // Race 1: No group only (precincts: [''])
    // Race 2: Ward 1 only (precincts: ['Ward 1'])
    VoterGroupsElection: {
        election_id: "0",
        title: 'Voter Groups Election',
        state: 'open',
        frontend_url: '',
        owner_id: 'Alice1234',
        credential_ids: ['Alice@email.com'],
        races: [
            {
                race_id: '0',
                title: 'Race 0 - Open',
                num_winners: 1,
                voting_method: 'STAR',
                candidates: [
                    { candidate_id: '0', candidate_name: 'A' },
                    { candidate_id: '1', candidate_name: 'B' },
                    { candidate_id: '2', candidate_name: 'C' },
                ],
            },
            {
                race_id: '1',
                title: 'Race 1 - No Group',
                num_winners: 1,
                voting_method: 'STAR',
                precincts: [''],
                candidates: [
                    { candidate_id: '0', candidate_name: 'D' },
                    { candidate_id: '1', candidate_name: 'E' },
                    { candidate_id: '2', candidate_name: 'F' },
                ],
            },
            {
                race_id: '2',
                title: 'Race 2 - Ward 1',
                num_winners: 1,
                voting_method: 'STAR',
                precincts: ['Ward 1'],
                candidates: [
                    { candidate_id: '0', candidate_name: 'G' },
                    { candidate_id: '1', candidate_name: 'H' },
                    { candidate_id: '2', candidate_name: 'I' },
                ],
            },
        ] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: { email: true },
            voter_groups_enabled: true,
            voter_groups: ['Ward 1'],
        } as ElectionSettings,
    } as Election,

    // Roll for VoterGroupsElection: Alice has No group (''), Bob has Ward 1
    VoterGroupsRoll: [
        { email: 'Alice@email.com', precinct: '' },
        { email: 'Bob@email.com', precinct: 'Ward 1' },
    ],

    // Election with voter_groups_enabled off but races with precincts defined.
    // Race 0: open to all; Race 1: Ward 1 only.
    VoterGroupsOffElection: {
        election_id: "0",
        title: 'Voter Groups Off Election',
        state: 'open',
        frontend_url: '',
        owner_id: 'Alice1234',
        credential_ids: ['Alice@email.com'],
        races: [
            {
                race_id: '0',
                title: 'Race 0 - Open',
                num_winners: 1,
                voting_method: 'STAR',
                candidates: [
                    { candidate_id: '0', candidate_name: 'A' },
                    { candidate_id: '1', candidate_name: 'B' },
                    { candidate_id: '2', candidate_name: 'C' },
                ],
            },
            {
                race_id: '1',
                title: 'Race 1 - Ward 1 Only',
                num_winners: 1,
                voting_method: 'STAR',
                precincts: ['Ward 1'],
                candidates: [
                    { candidate_id: '0', candidate_name: 'D' },
                    { candidate_id: '1', candidate_name: 'E' },
                    { candidate_id: '2', candidate_name: 'F' },
                ],
            },
        ] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: { email: true },
            voter_groups_enabled: false,
        } as ElectionSettings,
    } as Election,

    // Closed election with voter_groups_enabled true; race filtering must not apply
    ClosedVoterGroupsElection: {
        election_id: "0",
        title: 'Closed Voter Groups Election',
        state: 'closed',
        frontend_url: '',
        owner_id: 'Alice1234',
        credential_ids: ['Alice@email.com'],
        races: [
            {
                race_id: '0',
                title: 'Race 0 - Open',
                num_winners: 1,
                voting_method: 'STAR',
                candidates: [
                    { candidate_id: '0', candidate_name: 'A' },
                    { candidate_id: '1', candidate_name: 'B' },
                    { candidate_id: '2', candidate_name: 'C' },
                ],
            },
            {
                race_id: '1',
                title: 'Race 1 - Ward 1 Only',
                num_winners: 1,
                voting_method: 'STAR',
                precincts: ['Ward 1'],
                candidates: [
                    { candidate_id: '0', candidate_name: 'D' },
                    { candidate_id: '1', candidate_name: 'E' },
                    { candidate_id: '2', candidate_name: 'F' },
                ],
            },
        ] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: { ip_address: true },
            voter_groups_enabled: true,
        } as ElectionSettings,
    } as Election,
    EmailWithPrecinctRoll:[
        {
            email:'Alice@email.com',
            precinct:'0'
        },
        {
            email:'Bob@email.com',
            precinct:'1'
        }
    ],
    
    Precinct0Ballot: {
        ballot_id: "1",
        election_id: "0",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        },
        {
            race_id:'1',
            scores: [{
                candidate_id: '0',
                score: 5,
            },
            {
                candidate_id: '1',
                score: 0,

            },
            {
                candidate_id: '2',
                score: 4,
            }
            ]
        }]
    } as NewBallot,
    Precinct1Ballot: {
        ballot_id: "0",
        election_id: "0",
        status: 'Submitted',
        date_submitted: Date.now(),
        votes: [{
            race_id:'0',
            scores: [{
                candidate_id: 'A',
                score: 5,
            },
            {
                candidate_id: 'B',
                score: 0,

            },
            {
                candidate_id: 'C',
                score: 4,
            }
            ]
        }]
    } as NewBallot,

    VoterGroupElection: {
        election_id: "0",
        title: 'Voter Group Election',
        state: 'draft',
        frontend_url: '',
        owner_id: 'Alice1234',
        races: [
            {
                race_id: '0',
                title: 'Open Race',
                num_winners: 1,
                voting_method: 'STAR',
                candidates: [
                    { candidate_id: '0', candidate_name: 'A' },
                    { candidate_id: '1', candidate_name: 'B' },
                    { candidate_id: '2', candidate_name: 'C' },
                ],
            },
            {
                race_id: '1',
                title: 'Group Race',
                num_winners: 1,
                voting_method: 'STAR',
                precincts: ['Ward 1', 'Ward 2'],
                candidates: [
                    { candidate_id: '0', candidate_name: 'D' },
                    { candidate_id: '1', candidate_name: 'E' },
                    { candidate_id: '2', candidate_name: 'F' },
                ],
            },
        ] as Race[],
        settings: {
            voter_access: 'open',
            voter_authentication: { email: true },
            voter_groups: ['Ward 1', 'Ward 2'],
            voter_groups_enabled: true,
        } as ElectionSettings,
    } as Election,

    VoterGroupRoll: [
        { email: 'Alice@email.com', precinct: 'Ward 1' },
        { email: 'Bob@email.com', precinct: 'Ward 2' },
    ],
}

