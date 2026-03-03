require("dotenv").config();
const request = require("supertest");

import { Election, electionValidation } from "@equal-vote/star-vote-shared/domain_model/Election";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("Multi Race Precinct Election", () => {
    var electionRes: Election;
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
