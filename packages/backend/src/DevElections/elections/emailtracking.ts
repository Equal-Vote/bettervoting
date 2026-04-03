import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { ElectionRoll, ElectionRollState } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { EmailEvent } from '@equal-vote/star-vote-shared/domain_model/EmailEvent';
import { DevElectionDefinition, devBallotId } from '../types';
import { devElectionId } from '@equal-vote/star-vote-shared/utils/makeID';

const ELECTION_ID = devElectionId('emailtracking');
const RACE_ID = 'devtestemailtracking_race0';

const candidates = [
    { candidate_id: 'red', candidate_name: 'Red' },
    { candidate_id: 'green', candidate_name: 'Green' },
    { candidate_id: 'blue', candidate_name: 'Blue' },
];

const voters = [
    { voter_id: 'v-email-alice', email: 'alice@example.com', name: 'Alice' },
    { voter_id: 'v-email-bob', email: 'bob@example.com', name: 'Bob' },
    { voter_id: 'v-email-carol', email: 'carol@example.com', name: 'Carol' },
    { voter_id: 'v-email-dave', email: 'dave@example.com', name: 'Dave' },
    { voter_id: 'v-email-eve', email: 'eve@example.com', name: 'Eve' },
    { voter_id: 'v-email-frank', email: 'frank@example.com', name: 'Frank' },
];

const election: Election = {
    election_id: ELECTION_ID,
    title: 'Dev Test: Email Tracking',
    description: 'A dev test election with closed email rolls and fake email delivery events for testing the admin email status UI.',
    frontend_url: '',
    owner_id: '7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3',
    state: 'open',
    races: [
        {
            race_id: RACE_ID,
            title: 'Favorite Color',
            voting_method: 'STAR',
            num_winners: 1,
            candidates: candidates,
        },
    ],
    settings: {
        voter_access: 'closed',
        voter_authentication: { email: true },
        invitation: 'email',
    },
    create_date: new Date().toISOString(),
    update_date: Date.now().toString(),
    head: true,
    ballot_source: 'live_election',
};

// Only Alice and Bob have voted
const ballotPatterns: { voterIndex: number; scores: number[] }[] = [
    { voterIndex: 0, scores: [5, 3, 1] }, // Alice
    { voterIndex: 1, scores: [2, 5, 4] }, // Bob
];

function makeBallots(): Ballot[] {
    return ballotPatterns.map(({ voterIndex, scores }, i) => ({
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

function makeElectionRolls(): ElectionRoll[] {
    const now = new Date();
    return voters.map((v, i) => ({
        voter_id: v.voter_id,
        election_id: ELECTION_ID,
        email: v.email,
        submitted: i < ballotPatterns.length, // Alice and Bob have voted
        state: ElectionRollState.approved,
        history: [
            {
                action_type: 'added',
                actor: '7bdcad1b-55cd-4cfd-842f-6be3fa89f1c3',
                timestamp: now.getTime() - 86400000, // 1 day ago
            },
        ],
        create_date: new Date(now.getTime() - 86400000).toISOString(),
        update_date: Date.now().toString(),
        head: true,
    }));
}

function makeEmailEvents(): Omit<EmailEvent, 'id'>[] {
    const baseTime = Date.now() - 3600000; // 1 hour ago
    const events: Omit<EmailEvent, 'id'>[] = [];

    const ts = (offset: number) => new Date(baseTime + offset).toISOString();

    // Alice: sent → processed → delivered (happy path)
    events.push(
        { message_id: 'msg-alice-invite', election_id: ELECTION_ID, voter_id: 'v-email-alice', event_type: 'sent', event_timestamp: ts(0), details: { status_code: 202 } },
        { message_id: 'msg-alice-invite', election_id: ELECTION_ID, voter_id: 'v-email-alice', event_type: 'processed', event_timestamp: ts(1000) },
        { message_id: 'msg-alice-invite', election_id: ELECTION_ID, voter_id: 'v-email-alice', event_type: 'delivered', event_timestamp: ts(3000), details: { response: '250 OK' } },
    );

    // Bob: sent → processed → delivered → opened (engaged)
    events.push(
        { message_id: 'msg-bob-invite', election_id: ELECTION_ID, voter_id: 'v-email-bob', event_type: 'sent', event_timestamp: ts(0), details: { status_code: 202 } },
        { message_id: 'msg-bob-invite', election_id: ELECTION_ID, voter_id: 'v-email-bob', event_type: 'processed', event_timestamp: ts(1000) },
        { message_id: 'msg-bob-invite', election_id: ELECTION_ID, voter_id: 'v-email-bob', event_type: 'delivered', event_timestamp: ts(2000), details: { response: '250 OK' } },
        { message_id: 'msg-bob-invite', election_id: ELECTION_ID, voter_id: 'v-email-bob', event_type: 'open', event_timestamp: ts(60000) },
    );

    // Carol: sent → processed → bounced (bad address)
    events.push(
        { message_id: 'msg-carol-invite', election_id: ELECTION_ID, voter_id: 'v-email-carol', event_type: 'sent', event_timestamp: ts(0), details: { status_code: 202 } },
        { message_id: 'msg-carol-invite', election_id: ELECTION_ID, voter_id: 'v-email-carol', event_type: 'processed', event_timestamp: ts(1000) },
        { message_id: 'msg-carol-invite', election_id: ELECTION_ID, voter_id: 'v-email-carol', event_type: 'bounce', event_timestamp: ts(2000), details: { reason: '550 No such user', status: '5.1.1', bounce_classification: 'Invalid' } },
    );

    // Dave: sent → processed → deferred (still trying)
    events.push(
        { message_id: 'msg-dave-invite', election_id: ELECTION_ID, voter_id: 'v-email-dave', event_type: 'sent', event_timestamp: ts(0), details: { status_code: 202 } },
        { message_id: 'msg-dave-invite', election_id: ELECTION_ID, voter_id: 'v-email-dave', event_type: 'processed', event_timestamp: ts(1000) },
        { message_id: 'msg-dave-invite', election_id: ELECTION_ID, voter_id: 'v-email-dave', event_type: 'deferred', event_timestamp: ts(2000), details: { reason: '421 Try again later', attempt: '1' } },
        { message_id: 'msg-dave-invite', election_id: ELECTION_ID, voter_id: 'v-email-dave', event_type: 'deferred', event_timestamp: ts(120000), details: { reason: '421 Try again later', attempt: '2' } },
    );

    // Eve: sent → processed → dropped (previously bounced)
    events.push(
        { message_id: 'msg-eve-invite', election_id: ELECTION_ID, voter_id: 'v-email-eve', event_type: 'sent', event_timestamp: ts(0), details: { status_code: 202 } },
        { message_id: 'msg-eve-invite', election_id: ELECTION_ID, voter_id: 'v-email-eve', event_type: 'dropped', event_timestamp: ts(1000), details: { reason: 'Bounced Address', status: '5.0.0' } },
    );

    // Frank: sent → processed → delivered → spam_report (uh oh)
    events.push(
        { message_id: 'msg-frank-invite', election_id: ELECTION_ID, voter_id: 'v-email-frank', event_type: 'sent', event_timestamp: ts(0), details: { status_code: 202 } },
        { message_id: 'msg-frank-invite', election_id: ELECTION_ID, voter_id: 'v-email-frank', event_type: 'processed', event_timestamp: ts(1000) },
        { message_id: 'msg-frank-invite', election_id: ELECTION_ID, voter_id: 'v-email-frank', event_type: 'delivered', event_timestamp: ts(2000), details: { response: '250 OK' } },
        { message_id: 'msg-frank-invite', election_id: ELECTION_ID, voter_id: 'v-email-frank', event_type: 'spamreport', event_timestamp: ts(300000) },
    );

    return events;
}

const definition: DevElectionDefinition = {
    electionId: ELECTION_ID,
    election,
    makeBallots,
    makeElectionRolls,
    makeEmailEvents,
};

export default definition;
