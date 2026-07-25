require("dotenv").config();
const request = require("supertest");
const crypto = require("crypto");

import { TestHelper } from "./TestHelper";

/**
 * Contract test for the discord-bot integration.
 *
 * The discord bot (Equal-Vote/discord-bot, STARCustomLibs/BVWebInteract.py) is an
 * external client of this API. It builds requests by hand and shares no types with
 * this repo, so this test is the only thing in CI that flags a backend change that
 * would break it.
 *
 * Every request below replicates what BVWebInteract.py sends (endpoints, payload
 * shape, cookies), and every assertion is a field or status code the bot actually
 * reads. If a change makes this test fail, either restore compatibility or
 * coordinate a matching change in the discord-bot repo.
 *
 * The bot's full API surface (referenced by method name in BVWebInteract.py):
 *   1. POST /API/Elections           createElection()  — no auth cookies at all
 *   2. GET  /API/Election/:id        assignElection(), alreadyVoted()
 *   3. POST /API/Election/:id/vote   submitBallot()    — `temp_id` cookie only
 *   4. GET  /API/ElectionResult/:id  updateResults()
 *
 * Not covered here (test doubles can't represent it): the bot reads
 * election['description'] from GET /API/Election/:id even though it never sets a
 * description. In production postgres returns every column, so the key is present
 * with value null; the mocked stores echo back only what was inserted. If the GET
 * response ever stops including a `description` key for elections created without
 * one, the bot crashes with a KeyError while rendering the poll.
 */

const th = new TestHelper();

afterEach(() => {
  jest.clearAllMocks();
  th.afterEach();
});

// mirrors BVWebInteract.hashUser: sha256 hex of the stringified discord user id,
// prefixed with cookieLead ("" for bot-created polls, "vd-" for linked polls)
const hashUser = (userID: number, cookieLead: string = "") =>
  cookieLead + crypto.createHash("sha256").update(String(userID)).digest("hex");

// mirrors python str(poll.expires_at): "YYYY-MM-DD HH:MM:SS.ffffff+00:00"
const pythonDatetimeStr = (d: Date) =>
  d.toISOString().replace("T", " ").replace("Z", "000+00:00");

const question = "What should we eat?";
const raceId = "r-Xy1";
const candidates = [
  { candidate_id: "c-aB1", candidate_name: "Pizza" },
  { candidate_id: "c-cD2", candidate_name: "Tacos" },
  { candidate_id: "c-eF3", candidate_name: "Sushi" },
];

// exact shape built in BVWebInteract.createElection()
const createPayload = {
  Election: {
    end_time: pythonDatetimeStr(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    owner_id: hashUser(111111111111111111),
    is_public: false,
    state: "open",
    races: [
      {
        candidates: candidates,
        num_winners: 1,
        race_id: raceId,
        title: question,
        voting_method: "STAR",
      },
    ],
    title: question,
    settings: {
      voter_access: "open",
      // must be exactly the canonical open_unique_cookie shape from
      // VoterAuthenticationMode.ts — extra keys are rejected even when false.
      // (The bot used to send address/email/ip_address/phone: false and was
      // broken by the canonicalization added 2026-05-15.)
      voter_authentication: {
        voter_id: true,
      },
      public_results: true,
    },
  },
};

// exact shape built in BVWebInteract.submitBallot(); scores are ints 0-5 by
// position in the candidates array
const ballotPayload = (electionId: string, scores: number[]) => ({
  ballot: {
    election_id: electionId,
    votes: [
      {
        race_id: raceId,
        scores: candidates.map((c, i) => ({
          candidate_id: c.candidate_id,
          score: scores[i],
        })),
      },
    ],
    date_submitted: Math.floor(Date.now() / 1000),
    status: "submitted",
  },
});

describe("discord bot contract", () => {
  let electionId: string;

  test("POST /API/Elections accepts the bot's anonymous create payload", async () => {
    // the bot sends no cookies whatsoever on create (requests.post(url, json=payload))
    const res = await request(th.expressApp)
      .post("/API/Elections")
      .send(createPayload);

    expect(res.statusCode).toBe(200);
    // the only field the bot reads from the response
    electionId = res.body.election.election_id;
    expect(typeof electionId).toBe("string");
    expect(electionId.length).toBeGreaterThan(0);
    th.testComplete();
  });

  test("GET /API/Election/:id returns the fields the bot renders", async () => {
    // assignElection(): plain GET, no cookies
    const res = await request(th.expressApp).get(`/API/Election/${electionId}`);

    expect(res.statusCode).toBe(200);
    const election = res.body.election;
    // prepView()/InitBallot read title and the first race's candidates by position
    expect(election.title).toBe(question);
    expect(election.races[0].race_id).toBe(raceId);
    expect(
      election.races[0].candidates.map((c: any) => ({
        candidate_id: c.candidate_id,
        candidate_name: c.candidate_name,
      }))
    ).toEqual(candidates);
    th.testComplete();
  });

  test("GET /API/Election/:id with the bot's user_id cookie returns 200 (alreadyVoted preflight)", async () => {
    // alreadyVoted() sends a `user_id` cookie and maps 200 -> "has not voted",
    // 400 -> "already voted". The backend ignores a `user_id` cookie, so this is
    // always 200 and the bot's real double-vote protection is the 400 from
    // POST .../vote below. If this ever starts returning non-200, the bot will
    // tell every voter they already voted.
    const res = await request(th.expressApp)
      .get(`/API/Election/${electionId}`)
      .set("Cookie", [`user_id=${hashUser(222222222222222222)}`]);

    expect(res.statusCode).toBe(200);
    th.testComplete();
  });

  test("GET /API/Election/:id for a missing election returns 400", async () => {
    // alreadyVoted() treats 400 as "already voted" and anything else as an error,
    // so a vanished election must map to 400, not 404/500
    const res = await request(th.expressApp).get("/API/Election/doesNotExist");
    expect(res.statusCode).toBe(400);
    th.testComplete();
  });

  test("POST /API/Election/:id/vote accepts a ballot identified only by temp_id cookie", async () => {
    // submitBallot(): the sha256 hash of the discord user id is the entire voter
    // identity, sent as the temp_id cookie
    const res = await request(th.expressApp)
      .post(`/API/Election/${electionId}/vote`)
      .set("Cookie", [`temp_id=${hashUser(222222222222222222)}`])
      .send(ballotPayload(electionId, [1, 5, 0]));

    expect(res.statusCode).toBe(200);
    th.testComplete();
  });

  test("a second vote with the same temp_id returns 400", async () => {
    // this 400 is the bot's only working double-vote protection (see the
    // alreadyVoted test above); the bot maps it to a "server error" message today
    const res = await request(th.expressApp)
      .post(`/API/Election/${electionId}/vote`)
      .set("Cookie", [`temp_id=${hashUser(222222222222222222)}`])
      .send(ballotPayload(electionId, [1, 5, 0]));

    expect(res.statusCode).toBe(400);
    th.testComplete();
  });

  test("a vote from a different temp_id succeeds (including the vd- linked-poll prefix)", async () => {
    // polls linked via /link_poll hash with a "vd-" cookieLead prefix
    const res = await request(th.expressApp)
      .post(`/API/Election/${electionId}/vote`)
      .set("Cookie", [`temp_id=${hashUser(333333333333333333, "vd-")}`])
      .send(ballotPayload(electionId, [0, 5, 2]));

    expect(res.statusCode).toBe(200);
    th.testComplete();
  });

  test("a vote with no cookies at all is rejected", async () => {
    // the bot never sends this, but its per-user dedup only works because the
    // backend refuses ballots that carry no voter identity; if this ever starts
    // succeeding, discord polls become anonymously stuffable
    const res = await request(th.expressApp)
      .post(`/API/Election/${electionId}/vote`)
      .send(ballotPayload(electionId, [5, 5, 5]));

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    th.testComplete();
  });

  test("GET /API/ElectionResult/:id exposes the winner where the bot looks for it", async () => {
    // updateResults(): plain GET, no cookies; the bot reads exactly
    // results[0].elected[0].name. Ballots above score Tacos 5+5, so it wins.
    const res = await request(th.expressApp).get(
      `/API/ElectionResult/${electionId}`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.results[0].elected[0].name).toBe("Tacos");
    th.testComplete();
  });
});
