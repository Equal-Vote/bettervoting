import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { ILoggingContext } from "../../Services/Logging/ILogger";
import { IBallotStore } from "../IBallotStore";

export default class BallotsDB implements IBallotStore {
    ballots: Ballot[] = [];

    constructor() {}
    submitBallot(ballot: Ballot, ctx:ILoggingContext, reason:string): Promise<Ballot> {
        var copy = JSON.parse(JSON.stringify(ballot));
        copy.head = true; // the real store always inserts ballots as the head version
        this.ballots.push(copy);
        return Promise.resolve(JSON.parse(JSON.stringify(copy)));
    }

    updateBallot(ballot: Ballot, ctx:ILoggingContext, reason:string): Promise<Ballot> {
        var copy = JSON.parse(JSON.stringify(ballot));
        this.ballots.push(copy);
        return Promise.resolve(JSON.parse(JSON.stringify(copy)));
    }

    // place holder bulkSubmitBallots for now
    bulkSubmitBallots(ballots: Ballot[], ctx:ILoggingContext, reason:string): Promise<Ballot[]>{
        return Promise.resolve(JSON.parse(JSON.stringify([] as Ballot[])));
    }

    getBallotsByElectionID(election_id: string, ctx:ILoggingContext): Promise<Ballot[]> {
        const ballots = this.ballots.filter(
            (ballot) => ballot.election_id === election_id
        );
        var resBallots = JSON.parse(JSON.stringify(ballots));
        return Promise.resolve(resBallots);
    }

    async *streamSubmittedBallotsByElectionID(election_id: string, ctx:ILoggingContext): AsyncIterableIterator<Ballot> {
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

    getBallotByVoterID(voter_id: string, election_id: string, ctx:ILoggingContext): Promise<Ballot | undefined> {
        const ballots = this.ballots.filter(
            (ballot) => ballot.user_id === voter_id
        );
        if (!ballots) {
            return Promise.resolve(undefined);
        }
        var resBallots = JSON.parse(JSON.stringify(ballots));
        return Promise.resolve(resBallots);
    }

    getBallotByID(ballot_id: string, ctx:ILoggingContext): Promise<Ballot | null> {
        const ballot = this.ballots.find(
            (ballot) => ballot.ballot_id === ballot_id
        );
        if (!ballot) {
            return Promise.resolve(null);
        }
        var resBallot = JSON.parse(JSON.stringify(ballot));
        return Promise.resolve(resBallot);
    }

    deleteAllBallotsForElectionID(election_id: string, ctx: ILoggingContext): Promise<boolean> {
        return Promise.resolve(true);
    }

    delete(ballot_id: Uid, ctx:ILoggingContext,reason:string): Promise<boolean> {
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
