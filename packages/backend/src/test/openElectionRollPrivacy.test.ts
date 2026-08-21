require("dotenv").config();

import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionSettings } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import ServiceLocator from "../ServiceLocator";
import Logger from "../Services/Logging/Logger";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";

const th = new TestHelper();
const ctx = Logger.createContext("openElectionRollPrivacy");

afterEach(() => {
  jest.clearAllMocks();
  th.afterEach();
});

// Asserts against the roll store rather than GET /rolls, because that endpoint refuses
// to list rolls for open elections — which is exactly why this had gone unnoticed. The
// row was still being written; nothing was reading it back.
async function rollsFor(electionId: string): Promise<ElectionRoll[]> {
  const rolls = await ServiceLocator.electionRollDb().getRollsByElectionID(electionId, ctx);
  return rolls ?? [];
}

// getOrCreateElectionRoll used to copy req.user.email and hashString(req.ip) onto every
// new roll regardless of the election's voter_authentication settings. The guard that
// decides whether to persist the roll does consult those settings, but the cast-vote path
// hands the roll to CastVoteStore.submitBallotEvent, which inserts it unconditionally — so
// an election that authenticates on nothing still ended up with an email address and an IP
// hash sitting next to the voter's ballot_id.
describe("Open election roll only stores what the election authenticates on", () => {
  // voter_access: 'open' + voter_authentication: {} — the "no authentication" mode
  // (VoterAuthenticationMode 'open_open'). Alice is signed in, so req.user.email is
  // populated even though the election never asks for it.
  describe("open_open", () => {
    var electionId = "";

    test("Create election", async () => {
      const response = await th.createElection(
        testInputs.MultiRaceElection,
        testInputs.user1token
      );
      expect(response.statusCode).toBe(200);
      expect(response.election.settings.voter_authentication).toEqual({});
      electionId = response.election.election_id;
      th.testComplete();
    });

    test("Signed-in voter can cast a ballot", async () => {
      const response = await th.submitBallot(
        electionId,
        testInputs.MultiRaceBallotValid2,
        testInputs.user1token
      );
      expect(response.statusCode).toBe(200);
      th.testComplete();
    });

    test("Roll records the ballot but neither the email nor the IP hash", async () => {
      const rolls = await rollsFor(electionId);
      expect(rolls.length).toBe(1);
      expect(rolls[0].submitted).toBe(true);
      expect(rolls[0].ballot_id).toBeTruthy();
      expect(rolls[0].email).toBeFalsy();
      expect(rolls[0].ip_hash).toBeFalsy();
      th.testComplete();
    });
  });

  // Control: same election with email authentication turned on. Here the email is what
  // the election authenticates on, so it must still be stored.
  describe("open + email authentication", () => {
    var electionId = "";
    const emailElection = {
      ...testInputs.MultiRaceElection,
      settings: {
        ...testInputs.MultiRaceElection.settings,
        voter_authentication: { email: true },
      } as ElectionSettings,
    } as Election;

    test("Create election", async () => {
      const response = await th.createElection(emailElection, testInputs.user1token);
      expect(response.statusCode).toBe(200);
      electionId = response.election.election_id;
      th.testComplete();
    });

    test("Signed-in voter can cast a ballot", async () => {
      const response = await th.submitBallot(
        electionId,
        testInputs.MultiRaceBallotValid2,
        testInputs.user1token
      );
      expect(response.statusCode).toBe(200);
      th.testComplete();
    });

    test("Roll still records the email", async () => {
      const rolls = await rollsFor(electionId);
      expect(rolls.length).toBe(1);
      expect(rolls[0].email).toEqual("Alice@email.com");
      th.testComplete();
    });
  });

  // Control: IP-address authentication is what Election1 uses, and it's the only mode
  // that should produce an ip_hash.
  describe("open + ip_address authentication", () => {
    var electionId = "";
    const ipElection = {
      ...testInputs.MultiRaceElection,
      settings: {
        ...testInputs.MultiRaceElection.settings,
        voter_authentication: { ip_address: true },
      } as ElectionSettings,
    } as Election;

    test("Create election", async () => {
      const response = await th.createElection(ipElection, testInputs.user1token);
      expect(response.statusCode).toBe(200);
      electionId = response.election.election_id;
      th.testComplete();
    });

    test("Signed-in voter can cast a ballot", async () => {
      const response = await th.submitBallot(
        electionId,
        testInputs.MultiRaceBallotValid2,
        testInputs.user1token
      );
      expect(response.statusCode).toBe(200);
      th.testComplete();
    });

    test("Roll records the IP hash but not the email", async () => {
      const rolls = await rollsFor(electionId);
      expect(rolls.length).toBe(1);
      expect(rolls[0].ip_hash).toBeTruthy();
      expect(rolls[0].email).toBeFalsy();
      th.testComplete();
    });
  });
});
