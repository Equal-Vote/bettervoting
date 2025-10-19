import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { ILoggingContext } from "../Services/Logging/ILogger";

export interface IBallotStore {
    submitBallot: (ballot: Ballot, ctx:ILoggingContext, reason:string) => Promise<Ballot>;
    updateBallot: (ballot: Ballot, ctx: ILoggingContext, reason: string) => Promise<Ballot>;
    bulkSubmitBallots: (ballots: Ballot[], ctx:ILoggingContext, reason:string) => Promise<Ballot[]>;
    getBallotByID: (ballot_id: string, ctx:ILoggingContext) => Promise<Ballot | null>;
    getBallotsByElectionID: (election_id: string,  ctx:ILoggingContext) => Promise<Ballot[] | null>;
    getBallotByVoterID: (voter_id: string, election_id: string,  ctx:ILoggingContext) => Promise<Ballot | null>;
    delete(ballot_id: Uid,  ctx:ILoggingContext, reason:string): Promise<boolean>;
    deleteAllBallotsForElectionID: (election_id: string,  ctx:ILoggingContext) => Promise<boolean>;
}
