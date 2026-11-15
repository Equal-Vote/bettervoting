import { PaymentRequired } from "@curveball/http-errors";
import { ElectionEntitlements, EntitlementType } from "@equal-vote/star-vote-shared/domain_model/Entitlement";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { pricingConfig, sharedConfig } from "@equal-vote/star-vote-shared/config";
import ServiceLocator from "../../ServiceLocator";
import { ILoggingContext } from "../../Services/Logging/ILogger";

const EntitlementsModel = ServiceLocator.entitlementsDb();
const ElectionRollModel = ServiceLocator.electionRollDb();

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

export const voterLimitError = (voterLimit: number) =>
    new PaymentRequired(`Request Denied: this election is limited to ${voterLimit} voters`);

// The single gate for paid features: throws PaymentRequired (402) if the election's current state
// needs more than it's entitled to. Finalize calls it before leaving draft.
// Future paid features add their checks here.
export async function validateEntitlements(election: Election, ctx: ILoggingContext): Promise<void> {
    if (election.settings.voter_access !== 'closed') return;

    const { voter_limit: voterLimit } = await getElectionEntitlements(election.election_id, ctx);
    const rolls = await ElectionRollModel.getRollsByElectionID(election.election_id, ctx);
    if ((rolls?.length ?? 0) > voterLimit) {
        throw voterLimitError(voterLimit);
    }
}
