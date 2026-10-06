import { Entitlement, EntitlementType } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';

export default class EntitlementsDB {

    _entitlements: Entitlement[] = [];
    _nextId = 1;

    async insert(entitlements: Omit<Entitlement, 'id'>[], ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `MockEntitlements insert count=${entitlements.length}`);
        entitlements.forEach(e => this._entitlements.push({ ...e, id: this._nextId++ }));
    }

    async getTotalsByElection(election_id: string, _ctx: ILoggingContext): Promise<Partial<Record<EntitlementType, number>>> {
        const totals: Partial<Record<EntitlementType, number>> = {};
        this._entitlements
            .filter(e => e.election_id === election_id)
            .forEach(e => { totals[e.type] = (totals[e.type] ?? 0) + e.amount; });
        return totals;
    }
}
