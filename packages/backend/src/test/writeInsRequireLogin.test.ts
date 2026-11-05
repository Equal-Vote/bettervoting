import 'dotenv/config';

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";
import { hashString } from "../Controllers/controllerUtils";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const WRITE_IN_ERROR = "Write-in candidates require a signed-in election owner";

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

const makeElection = (owner_id: string, enable_write_in: boolean): Election => ({
    election_id: "0",
    title: 'Write-In Login Election',
    state: 'draft',
    frontend_url: '',
    owner_id,
    races: [makeRace(enable_write_in)],
    settings: {
        voter_access: 'open',
        voter_authentication: { ip_address: true },
        public_results: true,
    } as ElectionSettings,
} as Election);

describe("Write-ins require a signed-in owner", () => {
    test("signed-in user can create an election with write-ins", async () => {
        const response = await th.createElection(makeElection('Alice1234', true), testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.election.races[0].enable_write_in).toBe(true);
        th.testComplete();
    });

    test("temp user cannot create an election with write-ins", async () => {
        const response = await th.createElection(
            makeElection(testInputs.user4tempId, true),
            null,
            null,
            testInputs.user4tempId
        );
        expect(response.statusCode).toBe(400);
        expect((response.err as { error: string }).error).toContain(WRITE_IN_ERROR);
        th.testComplete();
    });

    test("no user at all cannot create an election with write-ins", async () => {
        const response = await th.createElection(makeElection('Alice1234', true), null);
        expect(response.statusCode).toBe(400);
        expect((response.err as { error: string }).error).toContain(WRITE_IN_ERROR);
        th.testComplete();
    });

    test("temp user can create without write-ins but cannot enable them on edit", async () => {
        // Temp owners only get edit access when the owner_id follows the v- convention and
        // the request carries the matching temp_id and claim_key cookies.
        const tempId = 'v-tempwritein1';
        const claimKey = 'claim-key-for-write-in-test';
        const election = { ...makeElection(tempId, false), claim_key_hash: hashString(claimKey) } as Election;

        const created = await th.createElection(election, null, null, tempId);
        expect(created.statusCode).toBe(200);
        const electionId = created.election.election_id;
        const claimCookie = { [`${electionId}_claim_key`]: claimKey };

        // Sanity check: the temp owner can edit the election while write-ins stay off.
        const edited = await th.editElection(
            { ...created.election, title: 'Edited title' },
            null, null, tempId, claimCookie
        );
        expect(edited.statusCode).toBe(200);

        const withWriteIns = { ...edited.election, races: [makeRace(true)] } as Election;
        const rejected = await th.editElection(withWriteIns, null, null, tempId, claimCookie);
        expect(rejected.statusCode).toBe(400);
        expect((rejected.err as { error: string }).error).toContain(WRITE_IN_ERROR);

        const refetched = await th.fetchElectionById(electionId, null, null, tempId, claimCookie);
        expect(refetched.election.races[0].enable_write_in).toBeFalsy();
        th.testComplete();
    });
});
