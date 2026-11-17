import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { Uid } from '@equal-vote/star-vote-shared/domain_model/Uid';
import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { logSafeHash } from '../Services/Logging/logSafeHash';
import { BallotVersionRow, BallotVotes, IBallotStore } from './IBallotStore';
import { Kysely, sql, Transaction } from 'kysely';
import { Conflict } from '@curveball/http-errors';
import { Database } from './Database';

const tableName = 'ballotDB';
const electionRollTableName = 'electionRollDB';

export default class BallotsDB implements IBallotStore {
    _postgresClient;
    _tableName: string = tableName;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
        this.init()
    }

    async init(): Promise<IBallotStore> {
        const appInitContext = Logger.createContext("appInit");
        Logger.debug(appInitContext, "BallotsDB.init");
        return this;
    }

    async dropTable(ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.dropTable`);
        return this._postgresClient.schema.dropTable(tableName).execute()
    }

    submitBallot(ballot: Ballot, ctx: ILoggingContext, reason: string,
                 db: Kysely<Database> | Transaction<Database> = this._postgresClient): Promise<Ballot> {
        Logger.debug(ctx, `${tableName}.submit`) // removed ballot to make logging less noisy
        return this.makeSubmitBallotsQuery(ballot, ctx, reason, db) as Promise<Ballot>
    }

    // Optimistic concurrency: only the head version whose update_date the caller
    // read (`expected_update_date`) is demoted; anything else is a Conflict. The
    // demoted row's own update_date is left alone — it is that version's
    // timestamp, and the audit log orders ballot versions by it.
    async updateBallot(ballot: Ballot, ctx: ILoggingContext, reason: string, expected_update_date: string, db?: Kysely<Database> | Transaction<Database>): Promise<Ballot> {
        Logger.debug(ctx, `${tableName}.update`);
        const executeWork = async (activeDb: Kysely<Database> | Transaction<Database>) => {
            const demoted = await activeDb.updateTable(tableName)
                .where('ballot_id', '=', ballot.ballot_id)
                .where('election_id', '=', ballot.election_id)
                .where('head', '=', true)
                .where('update_date', '=', expected_update_date)
                .set('head', false)
                .executeTakeFirst();
            if (demoted.numUpdatedRows === BigInt(0)) {
                throw new Conflict('Concurrent write detected, please try again');
            }
            return this.submitBallot(ballot, ctx, reason, activeDb);
        };

        if (db) {
            return await executeWork(db);
        } else {
            return await this._postgresClient.transaction().execute(executeWork);
        }
    }

    bulkSubmitBallots(ballots: Ballot[], ctx: ILoggingContext, reason: string, db?: Kysely<Database> | Transaction<Database>): Promise<Ballot[]> {
        Logger.debug(ctx, `${tableName}.bulkSubmit`) // removed ballot to make logging less noisy
        return this.makeSubmitBallotsQuery(ballots, ctx, reason, db) as Promise<Ballot[]>
    }

    private makeSubmitBallotsQuery(inputBallots: Ballot | Ballot[], ctx: ILoggingContext, reason: string,
                                   db: Kysely<Database> | Transaction<Database> = this._postgresClient): Promise<Ballot[] | Ballot> {
        const ballots = Array.isArray(inputBallots)? inputBallots : [inputBallots];

        // Strip legacy fields (see Ballot.ts) so callers can't write them.
        const sanitizedBallots = ballots.map(b => {
            const { user_id: _user_id, ip_hash: _ip_hash, ...rest } = b;
            return {
                ...rest,
                update_date: Date.now().toString(), // Use now() because it doesn't change with time zone
                head: true,
                create_date: new Date().toISOString(),
            };
        });

        const query = db
            .insertInto(tableName)
            .values(sanitizedBallots)
            .returningAll()

        if(Array.isArray(inputBallots)){
            return query.execute()
        }else{
            return query.executeTakeFirstOrThrow()
        }
    }

    getBallotByID(ballot_id: string, ctx: ILoggingContext,
                  db: Kysely<Database> | Transaction<Database> = this._postgresClient): Promise<Ballot | null> {
        Logger.debug(ctx, `${tableName}.getBallotByID ${ballot_id}`);

        return db.selectFrom(tableName)
            .selectAll()
            .where('ballot_id', '=', ballot_id)
            .where('head', '=', true)
            .executeTakeFirstOrThrow()
            .catch((reason: unknown) => {
                Logger.debug(ctx, `${tableName}.get null`, reason);
                return null;
            });
    }


    // Every version of every ballot (head=false included): the audit log needs
    // the first version of each ballot for casts and the later ones for edits.
    getBallotVersionsByElectionID(election_id: string, ctx: ILoggingContext): Promise<BallotVersionRow[]> {
        Logger.debug(ctx, `${tableName}.getBallotVersionsByElectionID ${election_id}`);

        return this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .select(['ballot_id', 'update_date', 'history'])
            .orderBy('update_date', 'asc')
            .execute();
    }

    getBallotsByElectionID(election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>): Promise<Ballot[]> {
        Logger.debug(ctx, `${tableName}.getBallotsByElectionID ${election_id}`);
        const client = db || this._postgresClient;

        return client
            .selectFrom(tableName)
            .selectAll()
            .where('election_id', '=', election_id)
            .where('head', '=', true)
            .execute();
    }

    streamSubmittedBallotsByElectionID(election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>): AsyncIterableIterator<Ballot> {
        Logger.debug(ctx, `${tableName}.streamSubmittedBallotsByElectionID ${election_id}`);
        const client = db || this._postgresClient;

        return client
            .selectFrom(tableName)
            .selectAll()
            .where('election_id', '=', election_id)
            .where('head', '=', true)
            .where('status', '=', 'submitted')
            // Randomize order in the database (gen_random_uuid() is backed by a
            // strong RNG) so the response can't reveal ballot submission order —
            // the streaming equivalent of secureShuffle in controllerUtils.
            .orderBy(sql`gen_random_uuid()`)
            .stream(500) as AsyncIterableIterator<Ballot>;
    }

    // Tabulation only reads the marks, so select just the `votes` column and
    // stream it from a cursor. Skipping ballot_id/history/timestamps and never
    // holding the full result set is what keeps a large election's tabulation
    // from inflating the heap (see issue #1425).
    //
    // The filter deliberately matches getBallotsByElectionID (head only, any
    // status) rather than streamSubmittedBallotsByElectionID — narrowing it to
    // submitted ballots here would silently change election results.
    streamVotesByElectionID(election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>): AsyncIterableIterator<BallotVotes> {
        Logger.debug(ctx, `${tableName}.streamVotesByElectionID ${election_id}`);
        const client = db || this._postgresClient;

        return client
            .selectFrom(tableName)
            .select('votes')
            .where('election_id', '=', election_id)
            .where('head', '=', true)
            .stream(500) as AsyncIterableIterator<BallotVotes>;
    }

    getBallotByVoterID(voter_id: string, election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>): Promise<Ballot | undefined> {
        Logger.debug(ctx, `${tableName}.getBallotByVoterID ${logSafeHash(voter_id)} ${election_id}`);
        const client = db || this._postgresClient;

        return client
            .selectFrom(tableName)
            .innerJoin(electionRollTableName,
                (join) => join
                    .onRef(`${tableName}.ballot_id`, '=', `${electionRollTableName}.ballot_id`)
                    .onRef(`${tableName}.election_id`, '=', `${electionRollTableName}.election_id`)
            )
            .selectAll(tableName)
            .where(`${electionRollTableName}.voter_id`, '=', voter_id)
            .where(`${tableName}.election_id`, '=', election_id)
            .where(`${tableName}.head`, '=', true)
            .executeTakeFirst();
    }

    deleteAllBallotsForElectionID(election_id: string, ctx: ILoggingContext, db?: Kysely<Database> | Transaction<Database>): Promise<boolean> {
        Logger.debug(ctx, `${tableName}.deleteAllBallotsForElectionID ${election_id}`);
        const client = db || this._postgresClient;

        return client
            .deleteFrom(tableName)
            .where('election_id', '=', election_id)
            .returningAll()
            .execute()
            .then(() => true)
            .catch(() => false);
    }

    delete(ballot_id: Uid, ctx: ILoggingContext, reason: string, db?: Kysely<Database> | Transaction<Database>): Promise<boolean> {
        Logger.debug(ctx, `${tableName}.delete ${ballot_id}`);
        const client = db || this._postgresClient;

        return client
            .deleteFrom(tableName)
            .where('ballot_id', '=', ballot_id)
            .returningAll()
            .executeTakeFirst()
            .then((ballot) => {
                if (ballot) {
                    return true
                } else {
                    return false
                }
            })
    }
}
