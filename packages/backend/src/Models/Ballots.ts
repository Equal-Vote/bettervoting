import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { Uid } from '@equal-vote/star-vote-shared/domain_model/Uid';
import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { IBallotStore } from './IBallotStore';
import { Kysely, sql, Transaction } from 'kysely';
import { Database } from './Database';
import { InternalServerError } from '@curveball/http-errors';

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
        var appInitContext = Logger.createContext("appInit");
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

    async updateBallot(ballot: Ballot, ctx: ILoggingContext, reason: string): Promise<Ballot> {
        Logger.debug(ctx, `${tableName}.update`);
        return this._postgresClient.transaction().execute( async (tx) => {
            const update_response = await tx.updateTable(tableName)
                .where('ballot_id', '=', ballot.ballot_id)
                .where('election_id', '=', ballot.election_id)
                .where('head', '=', true)
                .set('head', false)
                //TODO: replace with DB trigger
                .set('update_date', Date.now().toString())
                .execute();
            return this.submitBallot(ballot, ctx, reason, tx);
        });
    }

    bulkSubmitBallots(ballots: Ballot[], ctx: ILoggingContext, reason: string): Promise<Ballot[]> {
        Logger.debug(ctx, `${tableName}.bulkSubmit`) // removed ballot to make logging less noisy
        return this.makeSubmitBallotsQuery(ballots, ctx, reason) as Promise<Ballot[]>
    }

    private makeSubmitBallotsQuery(inputBallots: Ballot | Ballot[], ctx: ILoggingContext, reason: string,
                                   db: Kysely<Database> | Transaction<Database> = this._postgresClient): Promise<Ballot[] | Ballot> {
        let ballots = Array.isArray(inputBallots)? inputBallots : [inputBallots];

        ballots.forEach(b => {
            b.update_date = Date.now().toString()// Use now() because it doesn't change with time zone 
            b.head = true
            b.create_date = new Date().toISOString()
        })

        let query = db
            .insertInto(tableName)
            .values(ballots)
            .returningAll()

        if(Array.isArray(inputBallots)){
            return query.execute()
        }else{
            return query.executeTakeFirstOrThrow()
        }
    }

    getBallotByID(ballot_id: string, ctx: ILoggingContext, voter_id?:string,
                  db: Kysely<Database> | Transaction<Database> = this._postgresClient): Promise<Ballot | null> {
        Logger.debug(ctx, `${tableName}.getBallotByID ${ballot_id}`);

        return db.selectFrom(tableName)
            .selectAll()
            .where('ballot_id', '=', ballot_id)
            .where('head', '=', true)
            .executeTakeFirstOrThrow()
            .catch((reason: any) => {
                Logger.debug(ctx, `${tableName}.get null`, reason);
                return null;
            });
    }


    getBallotsByElectionID(election_id: string, ctx: ILoggingContext): Promise<Ballot[] | null> {
        Logger.debug(ctx, `${tableName}.getBallotsByElectionID ${election_id}`);

        return this._postgresClient
            .selectFrom(tableName)
            .selectAll()
            .where('election_id', '=', election_id)
            .where('head', '=', true)
            .execute();
    }

    getBallotByVoterID(voter_id: string, election_id: string, ctx: ILoggingContext): Promise<Ballot | null> {
        Logger.debug(ctx, `${tableName}.getBallotByVoterID ${voter_id} ${election_id}`);

        return this._postgresClient
            .selectFrom(tableName)
            .innerJoin(electionRollTableName, `${tableName}.ballot_id`, `${electionRollTableName}.ballot_id`)
            .selectAll(tableName)
            .where(`${electionRollTableName}.voter_id`, '=', voter_id)
            .where(`${tableName}.head`, '=', true)
            .executeTakeFirstOrThrow()
            .catch((reason: any) => {
                Logger.debug(ctx, `${tableName}.get null`, reason);
                return null;
            });
    }

    deleteAllBallotsForElectionID(election_id: string, ctx: ILoggingContext): Promise<boolean> {
        Logger.debug(ctx, `${tableName}.deleteAllBallotsForElectionID ${election_id}`);

        return this._postgresClient
            .deleteFrom(tableName)
            .where('election_id', '=', election_id)
            .returningAll()
            .execute()
            .then(() => true)
            .catch(() => false);
    }

    delete(ballot_id: Uid, ctx: ILoggingContext, reason: string): Promise<boolean> {
        Logger.debug(ctx, `${tableName}.delete ${ballot_id}`);

        return this._postgresClient
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
