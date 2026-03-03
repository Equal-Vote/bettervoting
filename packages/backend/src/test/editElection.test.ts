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
            election1Copy.settings.voter_authentication.phone = true;
            election1Copy.election_id = ID;

            const response = await th.editElection(election1Copy, testInputs.user1token);

            expect(response.statusCode).toBe(200)
            
            const reFetchedElection = await fetchElectionById(ID);
            expect(election1Copy.settings.voter_authentication.phone).toEqual(true);
            th.testComplete();
        })
        test("edits voter ids", async () => {
            // TODO
        })
    })
})
