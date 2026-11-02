import 'dotenv/config';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";
import { hashString } from '../Controllers/controllerUtils';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Finalize Election", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    let electionId = "";
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

// Temp owners (temp_id cookie, no account) get the full owner role during the
// temporary-access window, so canEditElectionState alone would let them finalize.
// The wizard blocks that in the UI; finalizeElectionController enforces it server-side.
describe("Finalize Election as a temp owner", () => {
    // The owner-role grant for temp users requires owner_id to follow the v- convention
    // and the claim_key cookie to hash to the election's claim_key_hash
    // (elections.controllers.ts electionPostAuthMiddleware).
    const tempId = 'v-tempDanny4567';
    const claimKey = 'claim-key-for-danny';
    const tempDraftElection: Election = {
        ...testInputs.TempElection,
        state: 'draft',
        owner_id: tempId,
        claim_key_hash: hashString(claimKey),
    };
    let electionId = "";
    let claimCookie: Record<string, string> = {};

    test("Temp user creates a draft election, responds 200", async () => {
        const response = await th.createElection(tempDraftElection, null, null, tempId);
        expect(response.statusCode).toBe(200);
        electionId = response.election.election_id;
        claimCookie = { [`${electionId}_claim_key`]: claimKey };
        th.testComplete();
    });

    test("Temp owner holds the owner role: edit responds 200", async () => {
        // Sanity check so the 401 below is the sign-in requirement, not a missing role.
        const current = await th.fetchElectionById(electionId, null, null, tempId, claimCookie);
        const response = await th.postRequest(
            `/API/Election/${electionId}/edit`,
            {
                Election: { ...tempDraftElection, election_id: electionId, title: 'Renamed by temp owner' },
                expected_update_date: current.election?.update_date,
            },
            null,
            null,
            tempId,
            claimCookie
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("Temp owner cannot finalize, responds 401", async () => {
        const response = await th.finalizeElection(electionId, null, tempId, claimCookie);
        expect(response.statusCode).toBe(401);
        expect(response.err).toEqual({ error: expect.stringContaining("Create an account") });

        const after = await th.fetchElectionById(electionId, null, null, tempId, claimCookie);
        expect(after.election.state).toBe('draft');
        th.testComplete();
    });

    test("Temp user without the claim key gets a permissions 401", async () => {
        const response = await th.finalizeElection(electionId, null, tempId);
        expect(response.statusCode).toBe(401);
        expect(response.err).toEqual({ error: expect.stringContaining("Does not have permission") });
        th.testComplete();
    });
});
