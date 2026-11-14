import 'dotenv/config';

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const HOUR = 60 * 60 * 1000;

// An open election whose results are hidden. `ended` gives it an end time in the past,
// so the next request for it closes it.
const makeElection = (settings: Partial<ElectionSettings>, ended: boolean): Election => ({
    ...testInputs.Election1,
    state: 'open',
    ...(ended ? { start_time: new Date(Date.now() - 2 * HOUR), end_time: new Date(Date.now() - HOUR) } : {}),
    settings: { ...testInputs.Election1.settings, public_results: false, ...settings } as ElectionSettings,
} as Election);

describe("publish_results_on_close", () => {
    test("a scheduled election with the setting on publishes its results as it closes", async () => {
        const created = await th.createElection(makeElection({ publish_results_on_close: true }, true), testInputs.user1token);
        expect(created.statusCode).toBe(200);

        const fetched = await th.fetchElectionById(created.election.election_id, testInputs.user1token);
        expect(fetched.election.state).toBe('closed');
        expect(fetched.election.settings.public_results).toBe(true);
        th.testComplete();
    });

    test("a scheduled election with the setting off closes with its results still hidden", async () => {
        const created = await th.createElection(makeElection({}, true), testInputs.user1token);
        expect(created.statusCode).toBe(200);

        const fetched = await th.fetchElectionById(created.election.election_id, testInputs.user1token);
        expect(fetched.election.state).toBe('closed');
        expect(fetched.election.settings.public_results).toBe(false);
        th.testComplete();
    });

    test("closing by hand never publishes, whatever the setting says", async () => {
        const created = await th.createElection(makeElection({ publish_results_on_close: true }, false), testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        const current = await th.fetchElectionById(id, testInputs.user1token);
        expect(current.election.state).toBe('open');
        const closed = await th.postRequest(
            `/API/Election/${id}/setOpenState`,
            { open: false, expected_update_date: current.election.update_date },
            testInputs.user1token,
        );
        expect(closed.statusCode).toBe(200);
        expect(closed.body.election.state).toBe('closed');
        expect(closed.body.election.settings.public_results).toBe(false);
        th.testComplete();
    });

    test("the setting must be a boolean", async () => {
        const created = await th.createElection(
            makeElection({ publish_results_on_close: 'yes' as unknown as boolean }, false),
            testInputs.user1token,
        );
        expect(created.statusCode).toBe(400);
        th.testComplete();
    });
});
