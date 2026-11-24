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

// user1 owns these elections; user2 is signed in but has no role on them.
const makeElection = (state: Election['state'], settings: Partial<ElectionSettings> = {}): Election => ({
    election_id: "0",
    title: 'Unpublished Results Election',
    state,
    frontend_url: '',
    owner_id: 'Alice1234',
    races: [
        {
            race_id: 'race0',
            title: 'Best Leader',
            num_winners: 1,
            voting_method: 'STAR',
            candidates: [
                { candidate_id: '0', candidate_name: 'Alice' },
                { candidate_id: '1', candidate_name: 'Bob' },
            ],
        },
    ] as Race[],
    settings: {
        voter_access: 'open',
        voter_authentication: {},
        public_results: false,
        ...settings,
    } as ElectionSettings,
} as Election);

const create = async (state: Election['state'], settings: Partial<ElectionSettings> = {}) => {
    const created = await th.createElection(makeElection(state, settings), testInputs.user1token);
    expect(created.statusCode).toBe(200);
    return created.election.election_id;
};
const results = (id: string, token: string | null) => th.getRequest(`/API/ElectionResult/${id}`, token);
const ballots = (id: string, token: string | null) => th.getRequest(`/API/Election/${id}/anonymizedBallots`, token);

const post = async (id: string, path: string, body: object) => {
    const current = await th.fetchElectionById(id, testInputs.user1token);
    return th.postRequest(
        `/API/Election/${id}/${path}`,
        { ...body, expected_update_date: current.election.update_date },
        testInputs.user1token,
    );
};

describe("results and ballots before they are revealed", () => {
    test("open election: nobody gets them, the owner included", async () => {
        const id = await create('open');
        expect((await results(id, testInputs.user1token)).statusCode).toBe(403);
        expect((await ballots(id, testInputs.user1token)).statusCode).toBe(401);
        th.testComplete();
    });

    test("closed election: still nobody, until the owner reveals them", async () => {
        const id = await create('open');
        expect((await post(id, 'setOpenState', { open: false })).statusCode).toBe(200);

        expect((await results(id, testInputs.user1token)).statusCode).toBe(403);
        expect((await ballots(id, testInputs.user1token)).statusCode).toBe(401);
        expect((await results(id, null)).statusCode).toBe(403);

        expect((await post(id, 'setPublicResults', { public_results: true })).statusCode).toBe(200);

        expect((await results(id, null)).statusCode).toBe(200);
        expect((await ballots(id, null)).statusCode).toBe(200);
        th.testComplete();
    });

    test("draft election: its admins preview the test results, others don't", async () => {
        const id = await create('draft');
        expect((await results(id, testInputs.user1token)).statusCode).toBe(200);
        expect((await ballots(id, testInputs.user1token)).statusCode).toBe(200);

        expect((await results(id, testInputs.user2token)).statusCode).toBe(401);
        expect((await ballots(id, testInputs.user2token)).statusCode).toBe(401);
        th.testComplete();
    });
});

describe("revealing results while the election is open (preliminary results)", () => {
    test("an election that does not allow it refuses, and reveals fine once closed", async () => {
        const id = await create('open');
        const refused = await post(id, 'setPublicResults', { public_results: true });
        expect(refused.statusCode).toBe(400);
        expect(JSON.stringify(refused.body)).toContain('does not allow preliminary results');
        expect((await results(id, null)).statusCode).toBe(403);

        expect((await post(id, 'setOpenState', { open: false })).statusCode).toBe(200);
        expect((await post(id, 'setPublicResults', { public_results: true })).statusCode).toBe(200);
        expect((await results(id, null)).statusCode).toBe(200);
        th.testComplete();
    });

    test("an election that allows it reveals while open", async () => {
        const id = await create('open', { allow_preliminary_results: true });
        expect((await post(id, 'setPublicResults', { public_results: true })).statusCode).toBe(200);
        expect((await results(id, null)).statusCode).toBe(200);
        expect((await ballots(id, null)).statusCode).toBe(200);
        th.testComplete();
    });

    test("public_results set some other way still shows nothing while open", async () => {
        // Created with public_results already on, as an API client could.
        const id = await create('open', { public_results: true });
        expect((await results(id, null)).statusCode).toBe(403);
        expect((await results(id, testInputs.user1token)).statusCode).toBe(403);
        expect((await ballots(id, null)).statusCode).toBe(401);
        th.testComplete();
    });

    test("reopening an election hides results it revealed while closed", async () => {
        const id = await create('open');
        expect((await post(id, 'setOpenState', { open: false })).statusCode).toBe(200);
        expect((await post(id, 'setPublicResults', { public_results: true })).statusCode).toBe(200);

        const reopened = await post(id, 'setOpenState', { open: true });
        expect(reopened.statusCode).toBe(200);
        expect(reopened.body.election.settings.public_results).toBe(false);
        expect((await results(id, null)).statusCode).toBe(403);
        th.testComplete();
    });

    test("reopening keeps results revealed when the election allows preliminary results", async () => {
        const id = await create('open', { allow_preliminary_results: true });
        expect((await post(id, 'setOpenState', { open: false })).statusCode).toBe(200);
        expect((await post(id, 'setPublicResults', { public_results: true })).statusCode).toBe(200);

        const reopened = await post(id, 'setOpenState', { open: true });
        expect(reopened.body.election.settings.public_results).toBe(true);
        expect((await results(id, null)).statusCode).toBe(200);
        th.testComplete();
    });

    test("hiding is never refused", async () => {
        const id = await create('open', { public_results: true });
        expect((await post(id, 'setPublicResults', { public_results: false })).statusCode).toBe(200);
        th.testComplete();
    });

    test("the setting must be a boolean", async () => {
        const created = await th.createElection(
            makeElection('draft', { allow_preliminary_results: 'yes' as unknown as boolean }),
            testInputs.user1token,
        );
        expect(created.statusCode).toBe(400);
        th.testComplete();
    });
});
