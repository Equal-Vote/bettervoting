import 'dotenv/config';

import { Election, electionValidation } from "@equal-vote/star-vote-shared/domain_model/Election";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Multi Race Precinct Election", () => {
    let electionRes: Election;
    test("responds with 200 status", async () => {
        const response = await th.createElection(
            testInputs.PrecinctElection,
            testInputs.user1token
        );

        expect(response.statusCode).toBe(200);
        expect(response.election).toBeTruthy();

        electionRes = response.election;
        expect(electionRes.title).toEqual(testInputs.PrecinctElection.title);
        expect(electionRes.races.length).toEqual(2)
        expect(electionValidation(electionRes)).toBeNull();
        th.testComplete();
    });
    test("Add Voter Roll", async () => {
        const response = await th.submitElectionRoll(
            electionRes.election_id,
            testInputs.EmailWithPrecinctRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("Voter 1 fetches election, gets both races", async () => {
        // Tests that voter only recieves races they can vote for
        const response = await th.fetchElectionById(
            electionRes.election_id,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        expect(response.election.races.length).toBe(2)
        expect(response.precinctFilteredElection.races.length).toBe(2)
        th.testComplete();
    });
    test("Voter 2 fetches election, gets only first race", async () => {
        // Tests that voter only recieves races they can vote for
        const response = await th.fetchElectionById(
            electionRes.election_id,
            testInputs.user2token
        );
        expect(response.statusCode).toBe(200);
        expect(response.election.races.length).toBe(2)
        expect(response.election.races[0].race_id).toBe('0')
        expect(response.precinctFilteredElection.races.length).toBe(1)
        expect(response.precinctFilteredElection.races[0].race_id).toBe('0')
        th.testComplete();
    });
    test("Voter 1 submits valid ballot in precinct 0", async () => {
        // Tests that a voter can cast a ballot for all races with their precinct
        const response = await th.submitBallot(
            electionRes.election_id,
            testInputs.Precinct0Ballot,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("Voter 2 submits invalid ballot in precinct 0", async () => {
        // Tests that a voter can't cast ballot with races without their precinct
        const response = await th.submitBallot(
            electionRes.election_id,
            testInputs.Precinct0Ballot,
            testInputs.user2token
        );
        expect(response.statusCode).toBe(400);
        th.testComplete();
    });
    test("Voter 2 submits valid ballot in precinct 1", async () => {
        // Tests that a voter can cast a ballot for all races with their precinct
        const response = await th.submitBallot(
            electionRes.election_id,
            testInputs.Precinct1Ballot,
            testInputs.user2token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
})

describe("Voter Groups On - Race Filtering", () => {
    let groupsElectionRes: Election;
    test("Create voter groups election", async () => {
        const response = await th.createElection(testInputs.VoterGroupsElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.election.races.length).toBe(3);
        groupsElectionRes = response.election;
        th.testComplete();
    });
    test("Add voter roll: Alice=No group, Bob=Ward 1", async () => {
        const response = await th.submitElectionRoll(
            groupsElectionRes.election_id,
            testInputs.VoterGroupsRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("No group voter gets races open to all and races with No group ticked", async () => {
        // Alice has precinct '' (No group); should see Race 0 (open) and Race 1 (No group), not Race 2 (Ward 1)
        // Regression: the old truthiness check (voterPrecinct && ...) blocked '' from matching
        const response = await th.fetchElectionById(groupsElectionRes.election_id, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.precinctFilteredElection.races.length).toBe(2);
        const raceIds = response.precinctFilteredElection.races.map((r) => r.race_id);
        expect(raceIds).toContain('0');
        expect(raceIds).toContain('1');
        expect(raceIds).not.toContain('2');
        th.testComplete();
    });
    test("Named group voter gets races open to all and their group races only", async () => {
        // Bob has precinct 'Ward 1'; should see Race 0 (open) and Race 2 (Ward 1), not Race 1 (No group)
        const response = await th.fetchElectionById(groupsElectionRes.election_id, testInputs.user2token);
        expect(response.statusCode).toBe(200);
        expect(response.precinctFilteredElection.races.length).toBe(2);
        const raceIds = response.precinctFilteredElection.races.map((r) => r.race_id);
        expect(raceIds).toContain('0');
        expect(raceIds).not.toContain('1');
        expect(raceIds).toContain('2');
        th.testComplete();
    });
})

describe("Voter Groups Off - Race Filtering Disabled", () => {
    let groupsOffElectionRes: Election;
    test("Create election with voter_groups_enabled false", async () => {
        const response = await th.createElection(testInputs.VoterGroupsOffElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        groupsOffElectionRes = response.election;
        th.testComplete();
    });
    test("Voter gets all races when voter_groups_enabled is false, regardless of race precincts", async () => {
        // Race 1 has precincts: ['Ward 1']. With voter_groups_enabled: false, the voter
        // (auto-enrolled, precinct undefined) must still see both races.
        const response = await th.fetchElectionById(groupsOffElectionRes.election_id, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.precinctFilteredElection.races.length).toBe(2);
        th.testComplete();
    });
})

describe("Closed Election - No Race Filtering", () => {
    let closedElectionRes: Election;
    test("Create closed election with voter_groups_enabled true", async () => {
        const response = await th.createElection(testInputs.ClosedVoterGroupsElection, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.election.races.length).toBe(2);
        closedElectionRes = response.election;
        th.testComplete();
    });
    test("Voter gets all races in closed election regardless of voter groups setting", async () => {
        // State is 'closed'; race filtering must not apply even when voter_groups_enabled is true
        const response = await th.fetchElectionById(closedElectionRes.election_id, testInputs.user1token);
        expect(response.statusCode).toBe(200);
        expect(response.precinctFilteredElection.races.length).toBe(2);
        th.testComplete();
    });
})
