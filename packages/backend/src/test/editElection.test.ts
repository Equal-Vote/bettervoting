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

const setupInitialElection = async ():Promise<Election> => {
    const response = await th.createElection(testInputs.Election1, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    return response.election;
}

const setupInitialTempElection = async ():Promise<Election> => {
    const response = await th.createElection(testInputs.TempElection, null, null, testInputs.user4tempId);
    expect(response.statusCode).toBe(200);
    return response.election;
}

const fetchElectionById = async (electionId:string):Promise<Election> => {
    const response = await th.fetchElectionById(electionId, testInputs.user1token);
    expect(response.election).toBeTruthy();
    return response.election;
}

describe("Edit Election", () => {

    describe("Election data provided", () => {
        test("responds with 200 status", async () => {
            const initial = await setupInitialElection();
            const response = await th.editElection(initial, testInputs.user1token);
            expect(response.statusCode).toBe(200);
            th.testComplete();
        })
    })

    describe("Election not provided/incorrect format", () => {
        test("responds with 400 status", async () => {
            const initial = await setupInitialElection()
            const response = await th.postRequest(`/API/Election/${initial.election_id}/edit`, { VoterIDList: [] }, testInputs.user1token );
            expect(response.statusCode).toBe(400);
            th.testComplete();
        })
    })

    describe("User is not owner", () => {
        test("responds with 401 status", async () => {
            const initial = await setupInitialElection();
            const response = await th.editElection(initial, testInputs.user2token);
            expect(response.statusCode).toBe(401);
            th.testComplete();
        })
    })

    describe("User is temp user", () => {
        test("responds with 401 status", async () => {
            const initial = await setupInitialTempElection();
            const response = await th.editElection(initial, null, null, testInputs.user4tempId);
            expect(response.statusCode).toBe(401);
            th.testComplete();
        })
    })

    describe("User edits election", () => {
        test("edits title", async () => {
            const initial = await setupInitialElection()
            const newTitle = `${initial.title} - Edited`;
            const editPayload = {...initial, title: newTitle};

            const response = await th.editElection(editPayload, testInputs.user1token);
            expect(response.statusCode).toBe(200);

            const reFetchedElection = await fetchElectionById(initial.election_id);
            expect(reFetchedElection.title).toEqual(newTitle);
            th.testComplete();
        })

        test("edits roll type", async () => {
            // I'm testing roll type specifically to make sure nested fields are applied correctly
            const initial = await setupInitialElection()
            const editPayload = JSON.parse(JSON.stringify(initial))
            editPayload.settings.voter_authentication.phone = true;

            const response = await th.editElection(editPayload, testInputs.user1token);
            expect(response.statusCode).toBe(200)

            const reFetchedElection = await fetchElectionById(initial.election_id);
            expect(reFetchedElection.settings.voter_authentication.phone).toEqual(true);
            th.testComplete();
        })
        test("edits voter ids", async () => {
            // TODO
        })

        test("rejects stale update_date with 409", async () => {
            const initial = await setupInitialElection();

            // First edit succeeds and bumps update_date.
            const firstEdit = {...initial, title: `${initial.title} v1`};
            const firstResp = await th.editElection(firstEdit, testInputs.user1token);
            expect(firstResp.statusCode).toBe(200);

            // Second edit reuses the original (now-stale) update_date. Server must reject.
            const staleEdit = {...initial, title: `${initial.title} v2`};
            const staleResp = await th.editElection(staleEdit, testInputs.user1token);
            expect(staleResp.statusCode).toBe(409);

            // The first edit's title should remain canonical.
            const reFetchedElection = await fetchElectionById(initial.election_id);
            expect(reFetchedElection.title).toEqual(`${initial.title} v1`);
            th.testComplete();
        })
    })
})
