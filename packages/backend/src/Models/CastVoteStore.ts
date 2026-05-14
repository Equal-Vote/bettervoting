import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { ILoggingContext } from "../Services/Logging/ILogger";
import Logger from "../Services/Logging/Logger";
import { Kysely } from "kysely";
import { Database } from "./Database";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";

export type CastVoteEvent = {
    requestId: Uid,
    inputBallot: Ballot,
    roll?: ElectionRoll,
    userEmail?: string,
    isBallotUpdate: boolean,
}

export default class CastVoteStore {
    _db: Kysely<Database>;

    constructor(db: Kysely<Database>) {
        this._db = db;
    }

    // Postgres error code for unique_violation
    private readonly POSTGRES_UNIQUE_VIOLATION = '23505';

    async submitBallotEvent(event: CastVoteEvent, ctx: ILoggingContext): Promise<void> {
        return this._db.transaction().execute(async (trx) => {
                if (event.inputBallot.user_id && !event.isBallotUpdate) {
                    const duplicateBallot = await trx.selectFrom('ballotDB')
                        .select(['ballot_id'])
                        .where('election_id', '=', event.inputBallot.election_id)
                        .where('user_id', '=', event.inputBallot.user_id)
                        .where('head', '=', true)
                        .executeTakeFirst();
                    
                    if (duplicateBallot) {
                        Logger.info(ctx, `Duplicate ballot detected for roll-less election user_id: ${event.inputBallot.user_id}`);
                    }
                }

                const ballotToInsert = { ...event.inputBallot };
                ballotToInsert.update_date = Date.now().toString();
                ballotToInsert.head = true;
                ballotToInsert.create_date = new Date().toISOString();

                if (event.isBallotUpdate) {
                    const updateBallotResult = await trx.updateTable('ballotDB')
                        .where('ballot_id', '=', ballotToInsert.ballot_id)
                        .where('election_id', '=', ballotToInsert.election_id)
                        .where('head', '=', true)
                        .set('head', false)
                        .execute();
                    
                    if (Number(updateBallotResult[0].numUpdatedRows) === 0) {
                        throw new Error("CONCURRENT_BALLOT_UPDATE_DETECTED"); 
                    }
                    
                    Logger.debug(ctx, `User updates a ballot`);
                } else {
                    Logger.debug(ctx, `User submits a ballot`);
                }

                await trx.insertInto('ballotDB')
                    .values(ballotToInsert)
                    .execute();

                if (event.roll != null) {
                    const originalUpdateDate = event.roll.update_date;
                    event.roll.submitted = true;
                    event.roll.update_date = Date.now().toString();
                    event.roll.head = true;

                    const updateResult = await trx.updateTable('electionRollDB')
                        .where('election_id', '=', event.roll.election_id)
                        .where('voter_id', '=', event.roll.voter_id)
                        .where('head', '=', true)
                        .where('update_date', '=', originalUpdateDate.toString()) // Optimistic Concurrency Control check
                        .set('head', false)
                        .execute();
                    
                    if (Number(updateResult[0].numUpdatedRows) === 0) {
                        const existingCount = await trx.selectFrom('electionRollDB')
                            .where('election_id', '=', event.roll.election_id)
                            .where('voter_id', '=', event.roll.voter_id)
                            .where('head', '=', true)
                            .select('voter_id')
                            .executeTakeFirst();

                        if (existingCount) {
                            throw new Error("CONCURRENT_ROLL_EDIT_DETECTED"); 
                        }
                    }

                    await trx.insertInto('electionRollDB')
                        .values(event.roll)
                        .execute();
                        
                    Logger.debug(ctx, `User submits a ballot`);
                }
        }).catch((e: any) => {
            if (e?.code === this.POSTGRES_UNIQUE_VIOLATION && 
                (e?.constraint === 'electionRollDB_unique_head' || e?.constraint === 'electionRollDB_pkey')) {
                throw new Error("ALREADY_VOTED");
            }
            throw e;
        });
    }
}
