
import { Ballot, NewBallot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ElectionSettings } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { Race } from '@equal-vote/star-vote-shared/domain_model/Race';
var jwt = require('jsonwebtoken')


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
            voter_authentication: {email: true},
            invitation: 'email',
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
            voter_access: 'closed',
            voter_authentication: {email: true},
        } as ElectionSettings
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
}

