require('dotenv').config();
const request = require('supertest');
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const setupInitialElection = async () => {
    const response = await th.createElection(testInputs.Election1, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    return response.election.election_id;
}

const setupInitialTempElection = async () => {
    const response = await th.createElection(testInputs.TempElection, null, null, testInputs.user4tempId);
    expect(response.statusCode).toBe(200);
    return response.election.election_id;
}

const fetchElectionById = async (electionId:string):Promise<Election> => {
    const response = await th.fetchElectionById(electionId, testInputs.user1token);
    expect(response.election).toBeTruthy();
    return response.election;
}

describe("Edit Election", () => {

    describe("Election data provided", () => {
        test("responds with 200 status", async () => {
            const electionId = await setupInitialElection();
            const election1Copy = { ...testInputs.Election1, election_id:electionId};
            //election1Copy.election_id = electionId;

            const response = await th.editElection(election1Copy, testInputs.user1token);
            expect(response.statusCode).toBe(200);
            th.testComplete();
        })
    })

    describe("Election not provided/incorrect format", () => {
        test("responds with 400 status", async () => {
            const ID = await setupInitialElection()
            const response = await th.postRequest(`/API/Election/${ID}/edit`, { VoterIDList: [] }, testInputs.user1token );
            expect(response.statusCode).toBe(400);
            th.testComplete();
        })
    })

    describe("User is not owner", () => {
        test("responds with 401 status", async () => {
            const ID = await setupInitialElection();
            const election1Copy = { ...testInputs.Election1, election_id:ID};
            const response = await th.editElection(election1Copy, testInputs.user2token);
            expect(response.statusCode).toBe(401);
            th.testComplete();
        })
    })

    describe("User is temp user", () => {
        test("responds with 401 status", async () => {
            const ID = await setupInitialTempElection();
            const tempElectionCopy = { ...testInputs.TempElection, election_id:ID};
            const response = await th.editElection(tempElectionCopy, null, null, testInputs.user4tempId);
            expect(response.statusCode).toBe(401);
            th.testComplete();
        })
    })

    describe("User edits election", () => {
        test("edits title", async () => {
            const electionId = await setupInitialElection()

            var election1Copy = {...testInputs.Election1};
            var newTitle = `${election1Copy.title} - Edited`;
            election1Copy.election_id = electionId;
            election1Copy.title = newTitle;

            const response = await th.editElection(election1Copy, testInputs.user1token);

            // expect(ElectionsDB.elections[election1Copy.election_id].title).toBe(newTitle)
            expect(response.statusCode).toBe(200);

            const reFetchedElection = await fetchElectionById(electionId);;
            expect(reFetchedElection.title).toEqual(newTitle);
            th.testComplete();
        })

        test("edits roll type", async () => {
            // I'm testing roll type specifically to make sure nested fields are applied correctly
            const ID = await setupInitialElection()
            // I wanted to use structuredClone here, but I had trouble getting it to work with jest :'(
            var election1Copy = JSON.parse(JSON.stringify(testInputs.Election1))
            // Election1 starts as open + ip_address (type 4); replace with open + email (type 3)
            election1Copy.settings.voter_authentication = {email: true};
            election1Copy.election_id = ID;

            const response = await th.editElection(election1Copy, testInputs.user1token);

            expect(response.statusCode).toBe(200)

            const reFetchedElection = await fetchElectionById(ID);
            expect(reFetchedElection.settings.voter_authentication.email).toEqual(true);
            expect(reFetchedElection.settings.voter_authentication.ip_address).toBeFalsy();
            th.testComplete();
        })
        test("edits voter ids", async () => {
            // TODO
        })
    })

    describe("Optimistic concurrency (expected_update_date)", () => {
        test("accepts edit when expected_update_date matches", async () => {
            const electionId = await setupInitialElection();
            const current = await fetchElectionById(electionId);
            const election1Copy = { ...testInputs.Election1, election_id: electionId };

            const response = await th.postRequest(
                `/API/Election/${electionId}/edit`,
                { Election: election1Copy, expected_update_date: current.update_date },
                testInputs.user1token,
            );
            expect(response.statusCode).toBe(200);
            th.testComplete();
        })

        test("rejects edit with 409 when expected_update_date is stale", async () => {
            const electionId = await setupInitialElection();
            const election1Copy = { ...testInputs.Election1, election_id: electionId };

            const response = await th.postRequest(
                `/API/Election/${electionId}/edit`,
                { Election: election1Copy, expected_update_date: 'definitely-not-the-current-date' },
                testInputs.user1token,
            );
            expect(response.statusCode).toBe(409);
            th.testComplete();
        })

        test("accepts edit when expected_update_date is omitted (backwards compatible)", async () => {
            const electionId = await setupInitialElection();
            const election1Copy = { ...testInputs.Election1, election_id: electionId };

            const response = await th.editElection(election1Copy, testInputs.user1token);
            expect(response.statusCode).toBe(200);
            th.testComplete();
        })
    })
})
