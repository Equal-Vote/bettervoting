import 'dotenv/config';

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { NewBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import ServiceLocator from "../ServiceLocator";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();
const waitForQueue = async () => (await th.eventQueue).waitUntilJobsFinished();
// ServiceLocator is jest.mock()'d in tests, so this is the in-memory store.
const rollStore = ServiceLocator.electionRollDb() as unknown as { _electionRolls: ElectionRoll[] };
const rollsFor = (electionId: string) => rollStore._electionRolls.filter(r => r.election_id === electionId && r.head);

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const makeElection = (voter_authentication: ElectionSettings['voter_authentication']): Election => ({
    election_id: "0",
    title: 'Open roll creation',
    state: 'open',
    frontend_url: '',
    owner_id: 'Alice1234',
    races: [{
        race_id: 'race0',
        title: 'Best Leader',
        num_winners: 1,
        voting_method: 'STAR',
        candidates: [
            { candidate_id: '0', candidate_name: 'Alice' },
            { candidate_id: '1', candidate_name: 'Bob' },
        ],
    }] as Race[],
    settings: {
        voter_access: 'open',
        voter_authentication,
        public_results: true,
    } as ElectionSettings,
} as Election);

const makeBallot = (election_id: string): NewBallot => ({
    election_id,
    votes: [{ race_id: 'race0', scores: [{ candidate_id: '0', score: 5 }, { candidate_id: '1', score: 0 }] }],
} as NewBallot);

const countBallots = async (electionId: string) => {
    const res = await th.getRequest(`/API/Election/${electionId}/anonymizedBallots`, testInputs.user1token);
    expect(res.statusCode).toBe(200);
    return (res.body.ballots as unknown[]).length;
};

describe("Open-access roll entries are created by voting, not by viewing", () => {
    test("Viewing a one-vote-per-network election writes no roll entry", async () => {
        const created = await th.createElection(makeElection({ ip_address: true }), testInputs.user1token);
        expect(created.statusCode).toBe(200);
        const id = created.election.election_id;

        const view = await th.fetchElectionById(id, null);
        expect(view.statusCode).toBe(200);
        expect(view.voterAuth.authorized_voter).toBe(true);
        expect(view.voterAuth.has_voted).toBe(false);

        const ballotPage = await th.requestBallot(id, null);
        expect(ballotPage.statusCode).toBe(200);
        expect(ballotPage.voterAuth.authorized_voter).toBe(true);

        expect(rollsFor(id)).toHaveLength(0);
        th.testComplete();
    });

    test("Viewing a one-vote-per-user election writes no roll entry", async () => {
        const created = await th.createElection(makeElection({ email: true }), testInputs.user1token);
        const id = created.election.election_id;

        const view = await th.fetchElectionById(id, testInputs.user2token);
        expect(view.statusCode).toBe(200);
        expect(view.voterAuth.authorized_voter).toBe(true);
        expect(rollsFor(id)).toHaveLength(0);
        th.testComplete();
    });

    test("Viewing a one-vote-per-device election writes no roll entry", async () => {
        const created = await th.createElection(makeElection({ voter_id: true }), testInputs.user1token);
        const id = created.election.election_id;

        // in device mode the voter's id is req.user.sub, which a login token provides too
        const view = await th.fetchElectionById(id, testInputs.user2token);
        expect(view.statusCode).toBe(200);
        expect(view.voterAuth.authorized_voter).toBe(true);
        expect(rollsFor(id)).toHaveLength(0);
        th.testComplete();
    });

    test("Voting creates the roll entry, and viewing afterwards shows it", async () => {
        const created = await th.createElection(makeElection({ ip_address: true }), testInputs.user1token);
        const id = created.election.election_id;

        const vote = await th.submitBallot(id, makeBallot(id), null);
        expect(vote.statusCode).toBe(200);
        await waitForQueue();

        const rolls = rollsFor(id);
        expect(rolls).toHaveLength(1);
        expect(rolls[0].submitted).toBe(true);

        const view = await th.fetchElectionById(id, null);
        expect(view.voterAuth.has_voted).toBe(true);
        th.testComplete();
    });

    // The in-memory store can't reproduce real interleaving (this also passes on the old code);
    // the advisory lock in ElectionRollModel.findOrCreateRoll was checked against Postgres.
    test("Simultaneous first votes from the same network create one roll entry and one ballot", async () => {
        const created = await th.createElection(makeElection({ ip_address: true }), testInputs.user1token);
        const id = created.election.election_id;

        await Promise.all([
            th.submitBallot(id, makeBallot(id), null),
            th.submitBallot(id, makeBallot(id), null),
            th.submitBallot(id, makeBallot(id), null),
        ]);
        await waitForQueue();

        expect(rollsFor(id)).toHaveLength(1);
        expect(await countBallots(id)).toBe(1);

        // and that network can still load the election afterwards
        const view = await th.fetchElectionById(id, null);
        expect(view.statusCode).toBe(200);
        expect(view.voterAuth.has_voted).toBe(true);
        th.testComplete();
    });
});
