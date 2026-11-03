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

// An admin import: every ballot is written and every listed roll row is marked as
// submitted, in one transaction. The two lists are deliberately not linked (no
// roll.ballot_id), see BallotImport.ts in shared.
export type ImportBallotsEvent = {
    requestId: Uid,
    ballots: Ballot[],
    rolls: ElectionRoll[],
}

const IMPORT_INSERT_CHUNK = 500;

export default class CastVoteStore {
    _db: Kysely<Database>;

    constructor(db: Kysely<Database>) {
        this._db = db;
    }

    async submitBallotEvent(event: CastVoteEvent, ctx: ILoggingContext): Promise<void> {
        return this._db.transaction().execute(async (trx) => {
                // Strip legacy fields (see Ballot.ts) so a crafted request body can't populate them.
                const { user_id: _user_id, ip_hash: _ip_hash, ...ballotToInsert } = event.inputBallot;
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
                        // OCC missed: someone updated this roll since we read it.
                        // Distinguish "they already voted" (submitted=true on the winning
                        // head row) from a true concurrent edit (admin state change,
                        // sendInvites email_data update, etc.).
                        const winningHead = await trx.selectFrom('electionRollDB')
                            .where('election_id', '=', event.roll.election_id)
                            .where('voter_id', '=', event.roll.voter_id)
                            .where('head', '=', true)
                            .select(['submitted'])
                            .executeTakeFirst();

                        if (winningHead?.submitted) {
                            throw new Error("ALREADY_VOTED");
                        }
                        if (winningHead) {
                            throw new Error("CONCURRENT_ROLL_EDIT_DETECTED");
                        }
                    }

                    // Strip legacy fields (see ElectionRoll.ts) so callers can't write them.
                    const { address: _address, registration: _registration, ...rollToInsert } = event.roll;
                    await trx.insertInto('electionRollDB')
                        .values(rollToInsert)
                        .execute();
                        
                    Logger.debug(ctx, `User submits a ballot`);
                }
        });
    }

    async importBallots(event: ImportBallotsEvent, ctx: ILoggingContext): Promise<void> {
        return this._db.transaction().execute(async (trx) => {
            Logger.debug(ctx, `Admin imports ${event.ballots.length} ballots, marking ${event.rolls.length} voters`);

            for (let i = 0; i < event.ballots.length; i += IMPORT_INSERT_CHUNK) {
                const chunk = event.ballots.slice(i, i + IMPORT_INSERT_CHUNK).map((ballot) => {
                    // Strip legacy fields (see Ballot.ts) so a crafted request body can't populate them.
                    const { user_id: _user_id, ip_hash: _ip_hash, ...ballotToInsert } = ballot;
                    ballotToInsert.update_date = Date.now().toString();
                    ballotToInsert.head = true;
                    ballotToInsert.create_date = new Date().toISOString();
                    return ballotToInsert;
                });
                await trx.insertInto('ballotDB').values(chunk).execute();
            }

            for (const roll of event.rolls) {
                const originalUpdateDate = roll.update_date;
                roll.submitted = true;
                roll.update_date = Date.now().toString();
                roll.head = true;

                // Same optimistic concurrency check as submitBallotEvent: if the row changed
                // since the controller read it (e.g. the voter just voted online), the whole
                // import rolls back rather than double-counting that voter.
                const updateResult = await trx.updateTable('electionRollDB')
                    .where('election_id', '=', roll.election_id)
                    .where('voter_id', '=', roll.voter_id)
                    .where('head', '=', true)
                    .where('update_date', '=', originalUpdateDate.toString())
                    .set('head', false)
                    .execute();

                if (Number(updateResult[0].numUpdatedRows) === 0) {
                    const winningHead = await trx.selectFrom('electionRollDB')
                        .where('election_id', '=', roll.election_id)
                        .where('voter_id', '=', roll.voter_id)
                        .where('head', '=', true)
                        .select(['submitted'])
                        .executeTakeFirst();
                    throw new Error(winningHead?.submitted ? "ALREADY_VOTED" : "CONCURRENT_ROLL_EDIT_DETECTED");
                }

                // Strip legacy fields (see ElectionRoll.ts) so callers can't write them.
                const { address: _address, registration: _registration, ...rollToInsert } = roll;
                await trx.insertInto('electionRollDB')
                    .values(rollToInsert)
                    .execute();
            }
        });
    }
}
