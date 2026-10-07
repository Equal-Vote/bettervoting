import { ElectionEntitlements, EntitlementType } from "@equal-vote/star-vote-shared/domain_model/Entitlement";
import { pricingConfig, sharedConfig } from "@equal-vote/star-vote-shared/config";
import ServiceLocator from "../../ServiceLocator";
import { ILoggingContext } from "../../Services/Logging/ILogger";

const EntitlementsModel = ServiceLocator.entitlementsDb();

// The single source of truth for what an election is entitled to: the free-tier default plus its entitlement rows.
// Callers (enforcement, GET /Election/:id) should read limits from here rather than combining the parts themselves.
export async function getElectionEntitlements(election_id: string, ctx: ILoggingContext): Promise<ElectionEntitlements> {
    const totals = await EntitlementsModel.getTotalsByElection(election_id, ctx);
    const entitlements = { ...pricingConfig.ENTITLEMENT_DEFAULTS };
    (Object.keys(entitlements) as EntitlementType[]).forEach(type => {
        entitlements[type] += totals[type] ?? 0;
    });

    // TEMPORARY: manual overrides replace the computed limit until they're migrated into admin_grant entitlement rows
    const overrides = sharedConfig.ELECTION_VOTER_LIMIT_OVERRIDES as Record<string, number>;
    if (election_id in overrides) {
        entitlements.voter_limit = overrides[election_id];
    }
    return entitlements;
}
