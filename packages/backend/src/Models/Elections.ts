import { Uid } from 'shared/domain_model/Uid';
import { Database } from './Database';
import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely, sql } from 'kysely'
import { Election } from 'shared/domain_model/Election';
const tableName = 'electionDB';

export default class ElectionsDB {
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
        Logger.debug(ctx, `${tableName}.updateElection`, election);
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
            .selectAll()
            .execute()

        // // Filter for settings.voter_access = open
        return openElections.filter((election: Election, index: any, array: any) => {
            return election.settings.voter_access == 'open';
        });
    }

    getElections(id: string, email: string, ctx: ILoggingContext): Promise<Election[] | null> {
        // When I filter in trello it adds "filter=member:arendpetercastelein,overdue:true" to the URL, I'm following the same pattern here
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
        const elections = query.execute()

        return elections
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

    async electionExistsByID(election_id: Uid, ctx: ILoggingContext): Promise<Boolean | string> {
        Logger.debug(ctx, `${tableName}.electionExistsByID ${election_id}`);

        let newElectionExists=true; // default to true, if there's an issue we don't want to risk a false assignment
        let classicElectionExists=false; // default to false, if classic.star.vote is down we don't want it to disable election creation

        await Promise.allSettled([
            // new star.vote
            new Promise((resolve, reject) => {
                this._postgresClient
                    .selectFrom(tableName)
                    .where('election_id', '=', election_id)
                    .where('head', '=', true)
                    .selectAll()
                    .execute()
                    .then(elections => {
                        newElectionExists = elections.length > 0;
                        resolve(undefined);
                    }).catch(reject);
            }),
            // classic.star.vote
            new Promise((resolve, reject) => {
                // https://stackoverflow.com/questions/46946380/fetch-api-request-timeout
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 3000);
                return fetch(`https://star.vote/${election_id}`, {signal: controller.signal})
                    .then((res) => res.text())
                    .then((content) => {
                        classicElectionExists = content != 'ERROR: the requested page does not appear to exist.<br />'
                        resolve(undefined)
                    })
                    .catch(reject)
            })
        ])

        if(classicElectionExists) return 'classic';

        return newElectionExists;
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