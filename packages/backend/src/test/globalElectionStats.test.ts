require("dotenv").config();
import { computeByYear } from "../Controllers/Election/getElectionsController";
import { TestHelper } from "./TestHelper";
import testInputs from "./testInputs";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";

// Unit tests for computeByYear — pure function, no DB needed

const CURRENT_YEAR = 2026;

function makeRace(method: string) {
    return { race_id: '0', title: 'R', num_winners: 1, voting_method: method as any, candidates: [] };
}

function electionData(election_id: string, owner_id: string, methods: string[], create_date: string) {
    return {
        election_id,
        owner_id,
        races: methods.map(makeRace),
        create_date,
    };
}

describe("computeByYear", () => {
    test("returns empty object when no qualifying elections", () => {
        const result = computeByYear([], [], [], CURRENT_YEAR);
        expect(result).toEqual({});
    });

    test("buckets a single qualifying election into its year", () => {
        const races = [electionData('e1', 'user1', ['STAR'], '2024-03-15T00:00:00Z')];
        const votes = [{ election_id: 'e1', v: 5 }];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        expect(result['2024']).toBeDefined();
        expect(result['2024'].elections).toBe(1);
        expect(result['2024'].votes).toBe(5);
        expect(result['2024'].star_elections).toBe(1);
        expect(result['2024'].star_votes).toBe(5);
    });

    test("produces a contiguous year range including current year", () => {
        const races = [electionData('e1', 'user1', ['STAR'], '2023-06-01T00:00:00Z')];
        const votes = [{ election_id: 'e1', v: 3 }];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        const years = Object.keys(result).sort();
        expect(years[0]).toBe('2023');
        expect(years[years.length - 1]).toBe(String(CURRENT_YEAR));
        for (let y = 2023; y <= CURRENT_YEAR; y++) {
            expect(result[String(y)]).toBeDefined();
        }
    });

    test("zero-fills years with no qualifying elections in the contiguous range", () => {
        const races = [
            electionData('e1', 'user1', ['STAR'], '2023-01-01T00:00:00Z'),
            electionData('e2', 'user1', ['Approval'], '2025-01-01T00:00:00Z'),
        ];
        const votes = [
            { election_id: 'e1', v: 3 },
            { election_id: 'e2', v: 4 },
        ];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        // 2024 is a gap year — still present, but zero-filled
        expect(result['2024']).toBeDefined();
        expect(result['2024'].elections).toBe(0);
        expect(result['2024'].votes).toBe(0);
        expect(result['2024'].star_elections).toBe(0);
    });

    test("excludes elections with fewer than 2 votes", () => {
        const races = [electionData('e1', 'user1', ['STAR'], '2024-01-01T00:00:00Z')];
        const votes = [{ election_id: 'e1', v: 1 }];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        expect(result).toEqual({});
    });

    test("excludes prior_election sourced elections", () => {
        const races = [electionData('e1', 'user1', ['STAR'], '2024-01-01T00:00:00Z')];
        const votes = [{ election_id: 'e1', v: 5 }];
        const result = computeByYear(races, votes, ['e1'], CURRENT_YEAR);

        expect(result).toEqual({});
    });

    test("buckets multi-method election as multi_method", () => {
        const races = [electionData('e1', 'user1', ['STAR', 'Approval'], '2024-06-01T00:00:00Z')];
        const votes = [{ election_id: 'e1', v: 10 }];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        expect(result['2024'].multi_method_elections).toBe(1);
        expect(result['2024'].multi_method_votes).toBe(10);
        expect(result['2024'].star_elections).toBe(0);
    });

    test("current year is always included even with no elections in it", () => {
        const races = [electionData('e1', 'user1', ['STAR'], '2024-01-01T00:00:00Z')];
        const votes = [{ election_id: 'e1', v: 3 }];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        expect(result[String(CURRENT_YEAR)]).toBeDefined();
        expect(result[String(CURRENT_YEAR)].elections).toBe(0);
    });

    test("handles null inputs gracefully", () => {
        const result = computeByYear(null, null, [], CURRENT_YEAR);
        expect(result).toEqual({});
    });

    test("elections with no races are excluded", () => {
        const races = [electionData('e1', 'user1', [], '2024-01-01T00:00:00Z')];
        const votes = [{ election_id: 'e1', v: 5 }];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        expect(result).toEqual({});
    });

    test("uses UTC year for elections near year boundary", () => {
        // 2023-12-31T23:30:00Z is still 2023 in UTC
        const races = [electionData('e1', 'user1', ['STAR'], '2023-12-31T23:30:00Z')];
        const votes = [{ election_id: 'e1', v: 5 }];
        const result = computeByYear(races, votes, [], CURRENT_YEAR);

        expect(result['2023']).toBeDefined();
        expect(result['2023'].star_elections).toBe(1);
        expect(result['2024']).toBeDefined();
        expect(result['2024'].star_elections).toBe(0);
    });
});

// Integration test — hits the real endpoint through TestHelper

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

describe("GET /API/GlobalElectionStats", () => {
    test("returns 200 with a stats object (not an unresolved promise)", async () => {
        const res = await th.getRequest('/API/GlobalElectionStats', null);
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeDefined();
        expect(typeof res.body.elections).toBe('number');
        expect(typeof res.body.votes).toBe('number');
        th.testComplete();
    });

    test("response includes by_year field as an object", async () => {
        const res = await th.getRequest('/API/GlobalElectionStats', null);
        expect(res.statusCode).toBe(200);
        expect(res.body.by_year).toBeDefined();
        expect(typeof res.body.by_year).toBe('object');
        expect(Array.isArray(res.body.by_year)).toBe(false);
        th.testComplete();
    });

    describe("with a qualifying election", () => {
        let electionId: string;

        test("creates an open election and casts 2 ballots", async () => {
            const createRes = await th.createElection(testInputs.MultiRaceElection, testInputs.user1token);
            expect(createRes.statusCode).toBe(200);
            electionId = createRes.election.election_id;

            const v1 = await th.submitBallot(electionId, testInputs.MultiRaceBallotValid1, testInputs.user1token);
            expect(v1.statusCode).toBe(200);
            const v2 = await th.submitBallot(electionId, testInputs.MultiRaceBallotValid2, testInputs.user2token);
            expect(v2.statusCode).toBe(200);
            th.testComplete();
        });

        test("the election appears in current year bucket of by_year", async () => {
            const statsRes = await th.getRequest('/API/GlobalElectionStats', null);
            expect(statsRes.statusCode).toBe(200);

            const currentYear = String(new Date().getUTCFullYear());
            expect(statsRes.body.by_year[currentYear]).toBeDefined();
            expect(statsRes.body.by_year[currentYear].elections).toBeGreaterThanOrEqual(1);
            expect(statsRes.body.by_year[currentYear].votes).toBeGreaterThanOrEqual(2);
            th.testComplete();
        });

        test("top-level totals reflect the qualifying election", async () => {
            const statsRes = await th.getRequest('/API/GlobalElectionStats', null);
            expect(statsRes.statusCode).toBe(200);
            expect(statsRes.body.elections).toBeGreaterThanOrEqual(1);
            expect(statsRes.body.votes).toBeGreaterThanOrEqual(2);
            th.testComplete();
        });
    });
});
