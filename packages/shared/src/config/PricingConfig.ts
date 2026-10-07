import { ElectionEntitlements } from "../domain_model/Entitlement";

const FREE_TIER_LIMIT = 100;

// What every election gets before any entitlement rows are added
const ENTITLEMENT_DEFAULTS: ElectionEntitlements = {
    voter_limit: FREE_TIER_LIMIT,
};

export const pricingConfig = {
    FREE_TIER_LIMIT,
    BLOCK_SIZE: 200,
    PRICE_PER_BLOCK_CENTS: 1000,
    ENTITLEMENT_DEFAULTS,
};
