import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { Vote } from "@equal-vote/star-vote-shared/domain_model/Vote";
import { ILoggingContext } from "../Services/Logging/ILogger";
import { Kysely, Transaction } from 'kysely';
import { Database } from './Database';

/** The only column tabulation reads off a ballot row. */
export interface BallotVotes {
    votes: Vote[];
}

export interface IBallotStore {
    submitBallot: (ballot: Ballot, ctx: ILoggingContext, reason: string, db?: Kysely<Database> | Transaction<Database>) => Promise<Ballot>;
    updateBallot: (ballot: Ballot, ctx: ILoggingContext, reason: string, db?: Kysely<Database> | Transaction<Database>) => Promise<Ballot>;
    bulkSubmitBallots: (ballots: Ballot[], ctx: ILoggingContext, reason: string, db?: Kysely<Database> | Transaction<Database>) => Promise<Ballot[]>;
    getBallotByID: (ballot_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>) => Promise<Ballot | null>;
    getBallotsByElectionID: (election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>) => Promise<Ballot[]>;
    // Streams head, submitted ballots in random order (see Ballots.ts for the anonymity rationale)
    streamSubmittedBallotsByElectionID: (election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>) => AsyncIterableIterator<Ballot>;
    // Streams just the votes column of every head ballot, for tabulation
    streamVotesByElectionID: (election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>) => AsyncIterableIterator<BallotVotes>;
    getBallotByVoterID: (voter_id: string, election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>) => Promise<Ballot | undefined>;
    delete(ballot_id: Uid, ctx: ILoggingContext, reason: string, db?: Kysely<Database> | Transaction<Database>): Promise<boolean>;
    deleteAllBallotsForElectionID: (election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>) => Promise<boolean>;
}
