require("dotenv").config();
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Strict ballot privacy", () => {
    test("blocks preliminary results while voting is open", async () => {
        const election = JSON.parse(JSON.stringify(testInputs.EmailRollElection));
        election.state = 'open';
        election.settings.strict_ballot_privacy = true;
        election.settings.public_results = false;

        const createResponse = await th.createElection(election, testInputs.user1token);
        expect(createResponse.statusCode).toBe(200);

        const publicResultsResponse = await th.setPublicResults(
            createResponse.election.election_id,
            true,
            testInputs.user1token
        );
        expect(publicResultsResponse.statusCode).toBe(400);
        th.testComplete();
    });

    test("blocks reopening after close", async () => {
        const election = JSON.parse(JSON.stringify(testInputs.EmailRollElection));
        election.state = 'open';
        election.settings.strict_ballot_privacy = true;

        const createResponse = await th.createElection(election, testInputs.user1token);
        expect(createResponse.statusCode).toBe(200);

        const closeResponse = await th.setOpenState(
            createResponse.election.election_id,
            false,
            testInputs.user1token
        );
        expect(closeResponse.statusCode).toBe(200);

        const reopenResponse = await th.setOpenState(
            createResponse.election.election_id,
            true,
            testInputs.user1token
        );
        expect(reopenResponse.statusCode).toBe(400);
        th.testComplete();
    });
});
