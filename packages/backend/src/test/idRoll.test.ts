require('dotenv').config();
const request = require('supertest');
import { ElectionRoll, ElectionRollState } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { MockEventQueue } from '../Services/EventQueue/MockEventQueue';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});


describe("ID Roll", () => {
    beforeAll(() => {
        
        jest.resetAllMocks();
    });
    var ID = "";
    test("Create election, responds 200", async () => {
        const response = await th.createElection(testInputs.IDRollElection, testInputs.user1token);

        expect(response.statusCode).toBe(200)
        ID = response.election.election_id;
        th.testComplete();
    })
    test("Add Voter Roll", async () => {
        const response = await th.submitElectionRoll(
            ID,
            testInputs.IDRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("Get voter auth, is authorized and hasn't voted", async () => {
        const response = await th.requestBallotWithId(ID, testInputs.user1token, testInputs.IDRoll[0].voter_id);
        expect(response.statusCode).toBe(200)

        expect(response.voterAuth.authorized_voter).toBe(true)
        expect(response.voterAuth.has_voted).toBe(false)
        th.testComplete();
    })
    test("Authorized voter submits ballot", async () => {
        const response = await th.submitBallotWithId(ID, testInputs.Ballot2, testInputs.user1token, testInputs.IDRoll[0].voter_id);
        expect(response.statusCode).toBe(200)

        const eventQueue:MockEventQueue = await th.eventQueue;
        await eventQueue.waitUntilJobsFinished();
        th.testComplete();
    })
    test("Get voter auth, is authorized and has voted", async () => {
        const response = await th.requestBallotWithId(ID, testInputs.user1token, testInputs.IDRoll[0].voter_id);

        expect(response.statusCode).toBe(200)
        expect(response.voterAuth.authorized_voter).toBe(true)
        expect(response.voterAuth.has_voted).toBe(true)
        th.testComplete();
    })
    test("Authorized voter re-submits ballot", async () => {
        const response = await th.submitBallotWithId(ID, testInputs.Ballot2, testInputs.user1token,  testInputs.IDRoll[0].voter_id);

        expect(response.statusCode).toBe(400)
        th.testComplete();
    })
    test("Get voter auth, isn't authorized and hasn't voted", async () => {
        const response = await th.requestBallotWithId(ID, testInputs.user3token, "FakeVoterID");
        expect(response.statusCode).toBe(200)
        expect(response.voterAuth.authorized_voter).toBe(false)
        expect(response.voterAuth.has_voted).toBe(false)
        th.testComplete();
    })
    test("Unauthorized voter submits ballot", async () => {
        const response = await th.submitBallotWithId(ID, testInputs.Ballot2, testInputs.user3token,  'FakeVoterID');

        expect(response.statusCode).toBe(401)
        th.testComplete();
    })
    test.each(['Alice?#', 'a/b\\c', '100%real', 'a%23b', 'a"&<>b'])("Imported ID %p survives API URL encoding and authentication", async voterId => {
        const added = await th.submitElectionRoll(ID, [{ voter_id: voterId }], testInputs.user1token);
        expect(added.statusCode).toBe(200);

        const roll = await th.getRequest(
            `/API/Election/${ID}/rolls/${encodeURIComponent(voterId)}`,
            testInputs.user1token,
        );
        expect(roll.statusCode).toBe(200);
        expect(roll.body.electionRollEntry.voter_id).toBe(voterId);

        const auth = await th.requestBallotWithId(ID, null, voterId);
        expect(auth.statusCode).toBe(200);
        expect(auth.voterAuth.authorized_voter).toBe(true);
        th.testComplete();
    });
})
