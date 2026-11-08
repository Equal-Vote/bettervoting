import 'dotenv/config';

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const OWNER_ERROR = "Elections with write-in candidates must be owned by the signed-in user who creates them";

const makeRace = (enable_write_in: boolean): Race => ({
    race_id: 'race0',
    title: 'Best Leader',
    num_winners: 1,
    voting_method: 'STAR',
    candidates: [
        { candidate_id: '0', candidate_name: 'Alice' },
        { candidate_id: '1', candidate_name: 'Bob' },
    ],
    enable_write_in,
} as Race);

const makeElection = (owner_id: string | null, enable_write_in: boolean, state: Election['state']): Election => ({
    election_id: "0",
    title: 'Write-In Owner Election',
    state,
    frontend_url: '',
    owner_id,
    races: [makeRace(enable_write_in)],
    settings: {
        voter_access: 'open',
        voter_authentication: { ip_address: true },
        public_results: true,
    } as ElectionSettings,
} as Election);

const errorOf = (response: { err: unknown }) => (response.err as { error: string }).error;

describe("Write-ins require an election owner", () => {
    test("anyone can create a draft with write-ins (finalizing needs an account)", async () => {
        const response = await th.createElection(
            makeElection(testInputs.user4tempId, true, 'draft'),
            null, null, testInputs.user4tempId
        );
        expect(response.statusCode).toBe(200);
        expect(response.election.races[0].enable_write_in).toBe(true);
        th.testComplete();
    });

    test("signed-in owner can create a finalized election with write-ins", async () => {
        const response = await th.createElection(makeElection('Alice1234', true, 'finalized'), testInputs.user1token);
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("signed-in Publish Now (ownerless, finalized) with write-ins is rejected", async () => {
        const response = await th.createElection(makeElection(null, true, 'finalized'), testInputs.user1token);
        expect(response.statusCode).toBe(400);
        expect(errorOf(response)).toContain(OWNER_ERROR);
        th.testComplete();
    });

    test("signed-out Publish Now with write-ins is rejected", async () => {
        const response = await th.createElection(makeElection(null, true, 'finalized'), null);
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });

    test("temp user cannot create a finalized election with write-ins", async () => {
        const response = await th.createElection(
            makeElection(testInputs.user4tempId, true, 'finalized'),
            null, null, testInputs.user4tempId
        );
        expect(response.statusCode).toBe(401);
        th.testComplete();
    });

    test("Publish Now without write-ins is unaffected", async () => {
        const response = await th.createElection(makeElection(null, false, 'finalized'), null);
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
});
