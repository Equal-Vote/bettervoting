import { ElectionEntitlements, EntitlementType } from "../domain_model/Entitlement";
import { pricingConfig } from "./PricingConfig";

// The Stripe Checkout `line_items[].price_data` shape the catalog produces. Declared here
// (rather than imported from the stripe package) so the frontend can use the catalog too.
export interface CatalogPriceData {
    currency: 'usd';
    unit_amount: number; // cents per unit
    product_data: {
        name: string;
        description: string;
        images?: string[];
    };
}

// A line in the itemized cart: what the frontend shows in its confirmation and posts to
// POST /Election/:id/CheckoutSession, which checks it against the catalog.
export interface CartLineItem {
    entitlement_type: EntitlementType;
    quantity: number;
    entitlement_amount: number; // total granted by this line, e.g. voters (not blocks)
    unit_amount: number; // cents per unit
}

// The parts of an election's state that decide what it needs to buy.
// After finalize, the frontend passes a roll_count that includes the pending upload.
export interface ItemizeState {
    roll_count: number;
}

export interface CatalogProduct {
    entitlement_type: EntitlementType;
    name: string;
    description: string;
    image?: string; // absolute URL; Stripe shows it on the hosted checkout page
    unit_amount: number; // cents per unit
    entitlementAmount: (quantity: number) => number;
    priceData: () => CatalogPriceData;
    // How many units the election needs to cover its state; 0 when it needs none
    quantityNeeded: (state: ItemizeState, entitlements: ElectionEntitlements) => number;
}

const { BLOCK_SIZE, PRICE_PER_BLOCK_CENTS } = pricingConfig;

const voterLimitBlock: CatalogProduct = {
    entitlement_type: 'voter_limit',
    name: `${BLOCK_SIZE} Additional Voters`,
    description: `Raises this election's voter limit by ${BLOCK_SIZE} voters.`,
    unit_amount: PRICE_PER_BLOCK_CENTS,
    entitlementAmount: (quantity) => quantity * BLOCK_SIZE,
    priceData() {
        return {
            currency: 'usd',
            unit_amount: this.unit_amount,
            product_data: {
                name: this.name,
                description: this.description,
                ...(this.image ? { images: [this.image] } : {}),
            },
        };
    },
    quantityNeeded: (state, entitlements) =>
        Math.ceil(Math.max(0, state.roll_count - entitlements.voter_limit) / BLOCK_SIZE),
};

// One entry per product, keyed by the entitlement type it grants.
// Fulfillment isn't per product: every product's effect is entitlement rows.
export const productCatalog: Record<EntitlementType, CatalogProduct> = {
    voter_limit: voterLimitBlock,
};

export function getCatalogProduct(entitlement_type: unknown): CatalogProduct | undefined {
    if (typeof entitlement_type !== 'string' || !Object.hasOwn(productCatalog, entitlement_type)) return undefined;
    return productCatalog[entitlement_type as EntitlementType];
}

// The catalog's line item for buying `quantity` units of a product
export function catalogLineItem(product: CatalogProduct, quantity: number): CartLineItem {
    return {
        entitlement_type: product.entitlement_type,
        quantity,
        entitlement_amount: product.entitlementAmount(quantity),
        unit_amount: product.unit_amount,
    };
}

// The line items an election needs to cover its state, given its current entitlements
export function itemize(state: ItemizeState, entitlements: ElectionEntitlements): CartLineItem[] {
    return Object.values(productCatalog)
        .map(product => ({ product, quantity: product.quantityNeeded(state, entitlements) }))
        .filter(({ quantity }) => quantity > 0)
        .map(({ product, quantity }) => catalogLineItem(product, quantity));
}
