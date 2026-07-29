import { Ballot, NewBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { VoterAuth } from "@equal-vote/star-vote-shared/domain_model/VoterAuth";
import makeApp from "../app";
import Logger from "../Services/Logging/Logger";
import { TestLoggerImpl } from "../Services/Logging/TestLoggerImpl";
import ServiceLocator  from "../ServiceLocator"
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import { candidate, rawVote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
const request = require("supertest");

type ElectionResponse = {
    statusCode: number;
    err: Object | null;
    election: Election;
    precinctFilteredElection: Election;
    voterAuth: VoterAuth;
};

type BallotResponse = {
    statusCode: number;
    err: Object | null;
    election: Election;
    voterAuth: VoterAuth;
};

export const mapMethodInputs = (names: string[], votes: (number | null)[][]): [candidate[], rawVote[]] => ([
    // candidates
    names.map((name,i) => ({name, id: name, tieBreakOrder: i, votesPreferredOver: {}, winsAgainst: {}} as candidate)) as candidate[],
    votes.map(v => ({
        marks: Object.fromEntries(names.map((name,i) => ([name, v[i]]))),
        overvote_rank: v?.[names.length] ?? undefined,
        has_duplicate_rank: v?.[names.length+1] ?? undefined,
    } as rawVote)) as rawVote[],
])

export class TestHelper {
    public expressApp;
    public logger: TestLoggerImpl;
    public emailService: any;
    public eventQueue:any;

    private ctx = Logger.createContext("testHelper");

    constructor() {
        this.emailService = ServiceLocator.emailService();
        this.eventQueue = ServiceLocator.eventQueue();
        this.expressApp = makeApp();
        this.logger = new TestLoggerImpl().setup();
    }

    getRequest(url: string, userToken: string | null, customToken: string| null = null, tempId: string|null=null) {
        var r = request(this.expressApp)
            .get(url)
            .set("Accept", "application/json");
        r = this.addUserTokenVoterIdCookie(r, userToken, null, customToken, tempId);
        return r;
    }

    postRequest(url: string, body: Object, userToken: string | null, customToken: string| null = null, tempId: string|null=null) {
        var r = request(this.expressApp)
            .post(url)
            .set("Accept", "application/json");
        r = this.addUserTokenVoterIdCookie(r, userToken, null, customToken, tempId);
        return r.send(body);
    }

    async createElection(
        election: Election,
        userToken: string | null,
        customToken: string | null = null,
        tempId: string | null = null
    ): Promise<ElectionResponse> {
        const res = await this.postRequest(
            "/API/Elections",
            {
                Election: election,
            },
            userToken,
            customToken,
            tempId
        );
        return this.electionResponse(res);
    }

    async editElection(
        election: Election,
        userToken: string | null,
        customToken: string | null = null,
        tempId: string | null = null
    ): Promise<ElectionResponse> {
        const res = await this.postRequest(
            `/API/Election/${election.election_id}/edit`,
            {
                Election: election,
            },
            userToken,
            customToken,
            tempId
        );
        return this.electionResponse(res);
    }

    async finalizeElection(
        election_id: Uid,
        userToken: string | null
    ): Promise<ElectionResponse> {
        const res = await this.postRequest(
            `/API/Election/${election_id}/finalize`,
            {},
            userToken
        );
        return this.electionResponse(res);
    }

    private electionResponse(res: any): ElectionResponse {
        if (res.statusCode != 200) {
            return {
                statusCode: res.statusCode,
                err: res.body,
                election: res.body.election,
                precinctFilteredElection: res.body.precinctFilteredElection,
                voterAuth: res.body.voterAuth,
            };
        }
        return {
            statusCode: res.statusCode,
            err: null,
            election: res.body.election,
            precinctFilteredElection: res.body.precinctFilteredElection,
            voterAuth: res.body.voterAuth,
        };
    }

    async fetchElectionById(
        electionId: Uid,
        userToken: string | null,
        customToken: string | null = null,
        tempId: string | null = null
    ): Promise<ElectionResponse> {
        const res = await this.getRequest(
            `/API/Election/${electionId}`,
            userToken,
            customToken,
            tempId
        );
        return this.electionResponse(res);
    }

    async submitBallot(
        electionId: Uid,
        ballot: Ballot | NewBallot,
        userToken: string | null
    ): Promise<any> {
        return this.postRequest(
            `/API/Election/${electionId}/vote`,
            { ballot: ballot },
            userToken
        );
    }

    async requestBallot(
        electionId: Uid,
        userToken: string | null,
        customToken: string| null = null
    ): Promise<BallotResponse> {
        const res = await this.postRequest(
            `/API/Election/${electionId}/ballot`,
            {},
            userToken,
            customToken
        );
        var err = null;
        if (res.statusCode != 200) {
            err = res.body;
        }
        return {
            statusCode: res.statusCode,
            err: err,
            election: res.body.election,
            voterAuth: res.body.voterAuth,
        };
    }

    async requestBallotWithId(
        electionId: Uid,
        userToken: string | null,
        voterId: string | null, 
        customToken: string| null = null
    ): Promise<BallotResponse> {
        var req = request(this.expressApp)
            .post(`/API/Election/${electionId}/ballot`)
            .set("Accept", "application/json");

        req = this.addUserTokenVoterIdCookie(req, userToken, voterId, customToken, null);

        const res = await req.send({});
        var err = null;
        if (res.statusCode != 200) {
            err = res.body;
        }
        return {
            statusCode: res.statusCode,
            err: err,
            election: res.body.election,
            voterAuth: res.body.voterAuth,
        };
    }

    async submitBallotWithId(
        electionId: Uid,
        ballot: Ballot | NewBallot,
        userToken: string | null,
        voterId: string | null,
        customToken: string| null = null
    ): Promise<any> {
        var r = request(this.expressApp)
            .post(`/API/Election/${electionId}/vote`)
            .set("Accept", "application/json");

        r = this.addUserTokenVoterIdCookie(r, userToken, voterId, customToken, null);
        return r.send({ ballot: ballot });
    }

    async submitElectionRoll(
        electionId: Uid,
        electionRoll: any[],
        userToken: string | null,
        customToken: string| null = null
    ): Promise<any> {
        var r = request(this.expressApp)
            .post(`/API/Election/${electionId}/rolls`)
            .set("Accept", "application/json");

        r = this.addUserTokenVoterIdCookie(r, userToken, null, customToken, null);
        return r.send({ electionRoll: electionRoll });
    }

    private addUserTokenVoterIdCookie(
        req: any,
        userToken: string | null,
        voterId: string | null,
        customToken: string | null,
        tempId: string | null,
    ): any {
        var cookies = "";
        if (userToken != null) {
            cookies = "id_token=" + userToken;
        }
        if (customToken != null) {
            if (cookies.length > 0) {
                cookies += "; ";
            }
            cookies += "custom_id_token=" + customToken;
        }
        if (voterId != null) {
            if (cookies.length > 0) {
                cookies += "; ";
            }
            cookies += "voter_id=" + btoa(voterId);
        }
        if (tempId != null) {
            if (cookies.length > 0) {
                cookies += "; ";
            }
            cookies += "temp_id=" + tempId;
        }
        if (cookies.length > 0) {
            req = req.set("Cookie", [cookies]);
        }
        return req;
    }

    afterEach() {
        this.logger.print();
        this.logger.clear();
        // this.emailService.clear();
    }

    testComplete() {
        this.logger.clear();
        // this.emailService.clear();
    }
}
