import { Uid } from '@equal-vote/star-vote-shared/domain_model/Uid';
import { Database } from './Database';
import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely, sql } from 'kysely'
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { sharedConfig } from '@equal-vote/star-vote-shared/config';
import { IElectionStore } from './IElectionStore';
import { InternalServerError } from '@curveball/http-errors';

const tableName = 'electionDB';

interface IVoteCount{
    election_id: string;
    v: number;
}

const dneCatcher = (error: any) => {
    if(error.code == '42P01'){
        throw new InternalServerError(`${error} \n\n----------------------\n\nTables weren't created. Perhaps you need to run the migrate command? Try running the following...\n\n  npm run build -w @equal-vote/star-vote-backend\n  npm run migrate:latest -w @equal-vote/star-vote-backend\n\n\n`)
    }
    throw error;
}

export default class ElectionsDB implements IElectionStore {
    _postgresClient;
    _tableName: string = tableName;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
        this.init()
    }

    async init(): Promise<ElectionsDB> {
        var appInitContext = Logger.createContext("appInit");
        Logger.debug(appInitContext, "-> ElectionsDB.init")
        return this;
    }

    async dropTable(ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.dropTable`);
        return this._postgresClient.schema.dropTable(tableName).execute()
    }

    createElection(election: Election, ctx: ILoggingContext, reason: string): Promise<Election> {
        Logger.debug(ctx, `${tableName}.createElection`, election);
        election.update_date = Date.now().toString()// Use now() because it doesn't change with time zone 
        election.head = true
        election.create_date = new Date().toISOString()

        const newElection = this._postgresClient
            .insertInto(tableName)
            .values(election)
            .returningAll()
            .executeTakeFirstOrThrow()
        return newElection
    }

    updateElection(election: Election, ctx: ILoggingContext, reason: string): Promise<Election> {
        Logger.debug(ctx, `${tableName}.updateElection`);
        election.update_date = Date.now().toString()
        election.head = true
        // Transaction to insert updated election and set old version's head to false
        const updatedElection = this._postgresClient.transaction().execute(async (trx) => {
            await trx.updateTable('electionDB')
                .where('election_id', '=', election.election_id)
                .where('head', '=', true)
                .set('head', false)
                .execute()

            return await trx.insertInto('electionDB')
                .values(election)
                .returningAll()
                .executeTakeFirstOrThrow()
        })

        return updatedElection
    }

    async getOpenElections(ctx: ILoggingContext): Promise<Election[] | null> {
        Logger.debug(ctx, `${tableName}.getOpenElections`);
        // Returns all elections where settings.voter_access == open and state == open

        // TODO: The filter is pretty inefficient for now since I don't think there's a way to include on settings.voter_access in the query
        const openElections = await this._postgresClient
            .selectFrom(tableName)
            .where('state', '=', 'open')
            .where('head', '=', true)
            .where("is_public", "=", true)
            .selectAll()
            .execute()

        // // Filter for settings.voter_access = open
        return openElections.filter((election: Election, index: any, array: any) => {
            return election.settings.voter_access == 'open';
        });
    }

    async getPublicArchiveElections(ctx: ILoggingContext): Promise<Election[] | null> {
        Logger.debug(ctx, `${tableName}.getPublicArchiveElections`);
        // Returns all elections where settings.voter_access == open and state == open

        // TODO: The filter is pretty inefficient for now since I don't think there's a way to include on settings.voter_access in the query
        return await this._postgresClient
            .selectFrom(tableName)
            .where('head', '=', true)
            .where('public_archive_id', 'is not', null)
            .selectAll()
            .execute()
    }

    async getElectionsCreatedInRange(ctx: ILoggingContext, startTime: Date, endTime: Date): Promise<Election[] | null> {
        Logger.debug(ctx, `${tableName}.getElectionsCreatedInRange`);

        console.log('start/end', startTime, endTime);

        return await this._postgresClient
            .selectFrom(tableName)
            .where('head', '=', true)
            .where('public_archive_id', 'is', null)
            // 30 days prior to today
            //.where('create_date', '>=', new Date(new Date().setDate(new Date().getDate() - 30)))
            .where('create_date', '>=', new Date(startTime))
            .where('create_date', '<=', new Date(endTime))
            .selectAll()
            .execute()
    }

    getElections(id: string, email: string, ctx: ILoggingContext): Promise<Election[] | null> {
        Logger.debug(ctx, `${tableName}.getAll ${id}`);

        let query = this._postgresClient
            .selectFrom(tableName)
            .where('head', '=', true)
            .selectAll()

        if (id !== '' || email !== '') {
            query = query.where(({ eb }) =>
                eb('owner_id', '=', id)
                    .or(sql`admin_ids::jsonb`, '?', email)
                    .or(sql`audit_ids::jsonb`, '?', email)
                    .or(sql`credential_ids::jsonb`, '?', email)
            )
        }

        return query.execute().catch(dneCatcher)
    }

    getElectionsSourcedFromPrior(ctx: ILoggingContext): Promise<Election[] | null> {
        Logger.debug(ctx, `${tableName}.getSourcedFromPrior`);

        return this._postgresClient
            .selectFrom(tableName)
            .where('ballot_source', '=', 'prior_election')
            .where('head', '=', true)
            .selectAll()
            .execute()
            .catch(dneCatcher);
    }

    // TODO: this function should probably be in the ballots model
    getBallotCountsForAllElections(ctx: ILoggingContext): Promise<IVoteCount[] | null> {
        Logger.debug(ctx, `${tableName}.getAllElectionsWithBallotCounts`);

        const result = this._postgresClient
            .selectFrom('ballotDB')
            //.select('election_id') // I don't really need this
            .select(
                (eb) => eb.fn.count('ballot_id').as('v')
            )
            .select('election_id')
            .where('head', '=', true)
            .groupBy('election_id')
            .orderBy('election_id')
            .execute();

        Logger.debug(ctx, result);

        return result as Promise<IVoteCount[] | null>;
    }


    getElectionByID(election_id: Uid, ctx: ILoggingContext): Promise<Election | null> {
        Logger.debug(ctx, `${tableName}.getElectionByID ${election_id}`);

        const election = this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .where('head', '=', true)
            .selectAll()
            .executeTakeFirstOrThrow()

        return election
    }

    async electionExistsByID(election_id: Uid, ctx: ILoggingContext): Promise<boolean | string> {
        Logger.debug(ctx, `${tableName}.electionExistsByID ${election_id}`);

        // Q: Why are you calling these in serial when it could be parallel?
        // A: I feel weird about calling classic.star.vote that frequently, so I'm only doing it when the id doesn't exist on our DB

        // Check New DB
        let newElections = await this._postgresClient
            .selectFrom(tableName)
            .where('election_id', '=', election_id)
            .where('head', '=', true)
            .selectAll()
            .execute()
            .catch(dneCatcher)
        if(newElections.length > 0) return true;

        // Check Classic DB
        // https://stackoverflow.com/questions/46946380/fetch-api-request-timeout
        const controller = new AbortController();
        const errorMessage = 'ERROR: the requested page does not appear to exist.<br />'
        setTimeout(() => controller.abort(), 3000);
        let content;
        try {
            content = await fetch(`${sharedConfig.CLASSIC_DOMAIN}/${election_id}`, {signal: controller.signal})
                .then((res:any) => res.text())
                .catch((err:any) => {
                    Logger.error(ctx, 'error pinging star.vote', err)
                    return errorMessage;
            })
        } catch (err) {
            content = errorMessage;
            Logger.debug(ctx, `Caught error while fetching classic domain: ${err}`);
        }

        if(content != errorMessage) return 'classic';

        return false;
    }

    getElectionByIDs(election_ids: Uid[], ctx: ILoggingContext): Promise<Election[] | null> {
        Logger.debug(ctx, `${tableName}.getElectionByIDs ${election_ids.join(',')}`);

        const elections = this._postgresClient
            .selectFrom(tableName)
            .where('election_id', 'in', election_ids)
            .where('head', '=', true)
            .selectAll()
            .execute()

        return elections
    }

    delete(election_id: Uid, ctx: ILoggingContext, reason: string): Promise<boolean> {
        Logger.debug(ctx, `${tableName}.delete ${election_id}`);

        const deletedElection = this._postgresClient
            .deleteFrom(tableName)
            .where('election_id', '=', election_id)
            .returningAll()
            .executeTakeFirst()

        return deletedElection.then((election) => {
            if (election) {
                return true
            } else {
                return false
            }
        }
        )
    }

    deleteAllElectionData(election_id: Uid, ctx: ILoggingContext, reason: string): Promise<void> {
        Logger.debug(ctx, `${tableName}.delete ${election_id}`);

        return this._postgresClient.transaction().execute(async (trx) => {
            await trx
                .deleteFrom('electionDB')
                .where('election_id', '=', election_id)
                .execute()

            await trx
                .deleteFrom('ballotDB')
                .where('election_id', '=', election_id)
                .execute()

            await trx
                .deleteFrom('electionRollDB')
                .where('election_id', '=', election_id)
                .execute()
        }
        )
    }
}