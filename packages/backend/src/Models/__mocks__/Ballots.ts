import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { ILoggingContext } from "../../Services/Logging/ILogger";
import { BallotVotes, IBallotStore } from "../IBallotStore";
import { Conflict } from "@curveball/http-errors";

export default class BallotsDB implements IBallotStore {
    ballots: Ballot[] = [];

    constructor() {}
    submitBallot(ballot: Ballot, _ctx:ILoggingContext, _reason:string): Promise<Ballot> {
        const copy = JSON.parse(JSON.stringify(ballot));
        copy.head = true; // the real store always inserts ballots as the head version
        copy.update_date = Date.now().toString();
        this.ballots.push(copy);
        return Promise.resolve(JSON.parse(JSON.stringify(copy)));
    }

    updateBallot(ballot: Ballot, _ctx:ILoggingContext, _reason:string, expected_update_date: string): Promise<Ballot> {
        // Mirrors the real store's optimistic concurrency: only the head version the
        // caller read can be replaced.
        const head = this.ballots.find(b => b.ballot_id === ballot.ballot_id && b.election_id === ballot.election_id && b.head);
        if (!head || String(head.update_date) !== expected_update_date) {
            return Promise.reject(new Conflict('Concurrent write detected, please try again'));
        }
        head.head = false;
        const copy = JSON.parse(JSON.stringify(ballot));
        copy.head = true;
        copy.update_date = Math.max(Date.now(), Number(head.update_date) + 1).toString();
        this.ballots.push(copy);
        return Promise.resolve(JSON.parse(JSON.stringify(copy)));
    }

    // place holder bulkSubmitBallots for now
    bulkSubmitBallots(_ballots: Ballot[], _ctx:ILoggingContext, _reason:string): Promise<Ballot[]>{
        return Promise.resolve(JSON.parse(JSON.stringify([] as Ballot[])));
    }

    getBallotsByElectionID(election_id: string, _ctx:ILoggingContext): Promise<Ballot[]> {
        const ballots = this.ballots.filter(
            (ballot) => ballot.election_id === election_id
        );
        const resBallots = JSON.parse(JSON.stringify(ballots));
        return Promise.resolve(resBallots);
    }

    async *streamSubmittedBallotsByElectionID(election_id: string, _ctx:ILoggingContext): AsyncIterableIterator<Ballot> {
        const ballots = this.ballots.filter(
            (ballot) => ballot.election_id === election_id && ballot.head && ballot.status === 'submitted'
        );
        // Shuffle to mimic the real store's random ordering
        for (let i = ballots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ballots[i], ballots[j]] = [ballots[j], ballots[i]];
        }
        for (const ballot of ballots) {
            yield JSON.parse(JSON.stringify(ballot));
        }
    }

    // mirrors getBallotsByElectionID's filter (see Ballots.ts) so tabulation
    // sees exactly the same ballots as the old non-streaming path
    async *streamVotesByElectionID(election_id: string, _ctx:ILoggingContext): AsyncIterableIterator<BallotVotes> {
        const ballots = this.ballots.filter(
            (ballot) => ballot.election_id === election_id
        );
        for (const ballot of ballots) {
            yield { votes: JSON.parse(JSON.stringify(ballot.votes)) };
        }
    }

    getBallotByVoterID(voter_id: string, _election_id: string, _ctx:ILoggingContext): Promise<Ballot | undefined> {
        const ballots = this.ballots.filter(
            (ballot) => ballot.user_id === voter_id
        );
        if (!ballots) {
            return Promise.resolve(undefined);
        }
        const resBallots = JSON.parse(JSON.stringify(ballots));
        return Promise.resolve(resBallots);
    }

    getBallotByID(ballot_id: string, _ctx:ILoggingContext): Promise<Ballot | null> {
        const ballot = this.ballots.find(
            (ballot) => ballot.ballot_id === ballot_id
        );
        if (!ballot) {
            return Promise.resolve(null);
        }
        const resBallot = JSON.parse(JSON.stringify(ballot));
        return Promise.resolve(resBallot);
    }

    deleteAllBallotsForElectionID(_election_id: string, _ctx: ILoggingContext): Promise<boolean> {
        return Promise.resolve(true);
    }

    delete(ballot_id: Uid, _ctx:ILoggingContext,_reason:string): Promise<boolean> {
        const ballot = this.ballots.find(
            (ballot) => ballot.ballot_id === ballot_id
        );
        if (!ballot) {
            return Promise.resolve(false);
        }
        this.ballots = this.ballots.filter(
            (ballot) => ballot.ballot_id != ballot_id
        );
        return Promise.resolve(true);
    }
}
