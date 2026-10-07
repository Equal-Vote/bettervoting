import { ILoggingContext } from '../Services/Logging/ILogger';
import Logger from '../Services/Logging/Logger';
import { Kysely } from 'kysely'
import { Database } from './Database';
import { Entitlement, EntitlementType } from '@equal-vote/star-vote-shared/domain_model/Entitlement';

const tableName = 'entitlementsDB';

export default class EntitlementsDB {

    _postgresClient;

    constructor(postgresClient: Kysely<Database>) {
        this._postgresClient = postgresClient;
    }

    async insert(entitlements: Omit<Entitlement, 'id'>[], ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `${tableName}.insert count=${entitlements.length}`);
        if (entitlements.length === 0) return;
        await this._postgresClient
            .insertInto(tableName)
            .values(entitlements)
            .execute();
    }

    // Net total per entitlement type for an election. Types with no rows are absent.
    async getTotalsByElection(election_id: string, ctx: ILoggingContext): Promise<Partial<Record<EntitlementType, number>>> {
        Logger.debug(ctx, `${tableName}.getTotalsByElection election_id=${election_id}`);
        const rows = await this._postgresClient
            .selectFrom(tableName)
            .select(['type', (eb) => eb.fn.sum('amount').as('total')])
            .where('election_id', '=', election_id)
            .groupBy('type')
            .execute();
        const totals: Partial<Record<EntitlementType, number>> = {};
        rows.forEach(row => { totals[row.type] = Number(row.total); });
        return totals;
    }
}
