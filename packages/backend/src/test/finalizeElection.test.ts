require("dotenv").config();
const request = require("supertest");
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Finalize Election", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    var electionId = "";
    test("Create election, responds 200", async () => {
        const EmailRollElection = testInputs.EmailRollElection
        EmailRollElection.state = 'draft'
        const response = await th.createElection(
            EmailRollElection,
            testInputs.user1token
        );

        expect(response.statusCode).toBe(200);
        electionId = response.election.election_id;
        th.testComplete();
    });
    test("Add Voter Roll", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            testInputs.EmailRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("Finalize Election", async () => {
        const response = await th.finalizeElection(
            electionId,
            testInputs.user1token
        );
        //Wait a few seconds for job queue to process emails, I imagine there's a better way to do this.
        await new Promise(resolve => setTimeout(resolve, 4000));

        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

});
