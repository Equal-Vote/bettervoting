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

describe("Create Election", () => {
  describe("Good Election data provided", () => {
    var electionRes: Election;
    test("responds with 200 status", async () => {
      const response = await th.createElection(
        testInputs.Election1,
        testInputs.user1token
      );

      expect(response.statusCode).toBe(200);
      expect(response.election).toBeTruthy();

      electionRes = response.election;
      expect(electionRes.title).toEqual(testInputs.Election1.title);
      expect(electionValidation(electionRes)).toBeNull();
      th.testComplete();
    });

    test("Get responds with 200 status", async () => {
      const response = await th.fetchElectionById(
        electionRes.election_id.toString(),
        testInputs.user1token
      );

      expect(response.statusCode).toBe(200);
      expect(response.election).toBeTruthy();
      expect(response.election.title).toEqual(testInputs.Election1.title);
      th.testComplete();
    });
  });

  describe("Election created with temp user", () => {
    var electionRes: Election;
    test("responds with 200 status", async () => {
      const response = await th.createElection(
        testInputs.TempElection,
        null,
        null,
        testInputs.user4tempId
      );

      expect(response.statusCode).toBe(200);
      expect(response.election).toBeTruthy();

      electionRes = response.election;
      expect(electionRes.title).toEqual(testInputs.TempElection.title);
      expect(electionValidation(electionRes)).toBeNull();
      th.testComplete();
    });

    test("Get responds with 200 status", async () => {
      const response = await th.fetchElectionById(
        electionRes.election_id.toString(),
        null,
        null,
        testInputs.user4tempId
      );

      expect(response.statusCode).toBe(200);
      expect(response.election).toBeTruthy();
      expect(response.election.title).toEqual(testInputs.TempElection.title);
      th.testComplete();
    });
  });

  describe("Election not provided/incorrect format", () => {
    test("responds with 400 status", async () => {
      const response = await th.createElection(
        {} as Election,
        testInputs.user1token
      );
      expect(response.statusCode).toBe(400);
      th.testComplete();
    });
  });
});
