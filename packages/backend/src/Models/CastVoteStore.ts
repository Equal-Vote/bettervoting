import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { ILoggingContext } from "../Services/Logging/ILogger";
import Logger from "../Services/Logging/Logger";
import { Kysely } from "kysely";
import { Database } from "./Database";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import ServiceLocator from "../ServiceLocator";

export type CastVoteEvent = {
    requestId: Uid,
    inputBallot: Ballot,
    roll?: ElectionRoll,
    userEmail?: string,
    isBallotUpdate: boolean,
}
var pgFormat = require("pg-format");

export default class CastVoteStore {
    _postgresClient;
    _db: Kysely<Database>;
    _ballotTableName: string;
    _rollTableName: string;

    constructor(postgresClient: any, db: Kysely<Database>) {
        this._postgresClient = postgresClient;
        this._db = db;
        this._ballotTableName = "ballotDB";
        this._rollTableName = "electionRollDB";
    }

    async submitBallotEvent(event: CastVoteEvent, ctx: ILoggingContext): Promise<void> {
        return this._db.transaction().execute(async (trx) => {
            if (event.roll) {
                const currentRoll = await trx.selectFrom('electionRollDB')
                    .select(['submitted'])
                    .where('election_id', '=', event.roll.election_id)
                    .where('voter_id', '=', event.roll.voter_id)
                    .where('head', '=', true)
                    .forUpdate()
                    .executeTakeFirst();

                if (currentRoll && currentRoll.submitted && !event.isBallotUpdate) {
                    throw new Error("ALREADY_VOTED");
                }

                if (!currentRoll) {
                    // Rescan to catch newly committed rows if a concurrent transaction modified our locked row while we waited.
                    const doubleCheckRoll = await trx.selectFrom('electionRollDB')
                        .select(['submitted'])
                        .where('election_id', '=', event.roll.election_id)
                        .where('voter_id', '=', event.roll.voter_id)
                        .where('head', '=', true)
                        .forUpdate()
                        .executeTakeFirst();

                    if (doubleCheckRoll && doubleCheckRoll.submitted && !event.isBallotUpdate) {
                        throw new Error("ALREADY_VOTED");
                    }
                }
            }

            const BallotModel = ServiceLocator.ballotsDb();
            const ElectionRollModel = ServiceLocator.electionRollDb();

            if (event.isBallotUpdate) {
                await BallotModel.updateBallot(event.inputBallot, ctx, `User updates a ballot`, trx);
            } else {
                await BallotModel.submitBallot(event.inputBallot, ctx, `User submits a ballot`, trx);
            }

            if (event.roll != null) {
                event.roll.submitted = true;
                await ElectionRollModel.update(event.roll, ctx, `User submits a ballot`, trx);
            }
        });
    }

    submitBallot(
        ballot: Ballot,
        roll: ElectionRoll,
        ctx: ILoggingContext,
        reason: String
    ): Promise<Ballot> {
        var ballotValues = [
            ballot.ballot_id,
            ballot.election_id,
            ballot.user_id,
            ballot.status,
            ballot.date_submitted,
            JSON.stringify(ballot.votes),
            JSON.stringify(ballot.history),
            ballot.precinct,
        ];

        const ballotSQL = pgFormat(
            `INSERT INTO ${this._ballotTableName} (ballot_id,election_id,user_id,status,date_submitted,ip_hash,votes,history,precinct)
        VALUES (%L);`,
            ballotValues
        );

        var rollSql = pgFormat(
            `UPDATE ${this._rollTableName} SET ballot_id=%L, submitted=%L, state=%L, history=%L, registration=%L WHERE election_id=%L AND voter_id=%L;`,
            roll.ballot_id,
            roll.submitted,
            roll.state,
            JSON.stringify(roll.history),
            JSON.stringify(roll.registration),
            roll.election_id,
            roll.voter_id,
        );
        Logger.debug(ctx, rollSql);

        const transactionSql = `BEGIN; ${ballotSQL} ${rollSql} COMMIT;`;
        Logger.debug(ctx, transactionSql);

        var p = this._postgresClient.query({
            rowMode: "array",
            text: transactionSql,
        });

        return p.then((res: any) => {
            Logger.state(ctx, `Ballot submitted`, {
                ballot: ballot,
                roll: roll,
                reason: reason,
            });
            return ballot;
        });
    }
}
