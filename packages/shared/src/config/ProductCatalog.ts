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
// Every unit_* field is per unit; the line's totals are that times quantity.
export interface CartLineItem {
    entitlement_type: EntitlementType;
    quantity: number;
    unit_entitlement: number; // entitlement each unit grants, e.g. voters per block
    unit_amount: number; // cents per unit
}

// The parts of an election's state that decide what it needs to buy.
// After finalize, the frontend passes a roll_count that includes the pending upload.
export interface ItemizeState {
    roll_count: number;
}

export interface CatalogProduct {
    entitlement_type: EntitlementType;
    name: string; // names the unit being bought, so Stripe's "Qty" reads naturally
    image?: string; // absolute URL; Stripe shows it on the hosted checkout page
    unit_entitlement: number; // entitlement each unit grants
    unit_amount: number; // cents per unit
    entitlementLabel: string; // what the entitlement raises, e.g. "voter limit"
    // Built per line so the description can state the line's total effect
    priceData: (quantity: number) => CatalogPriceData;
    // How many units the election needs to cover its state; 0 when it needs none
    quantityNeeded: (state: ItemizeState, entitlements: ElectionEntitlements) => number;
}

const { BLOCK_SIZE, PRICE_PER_BLOCK_CENTS } = pricingConfig;

const voterBlock: CatalogProduct = {
    entitlement_type: 'voter_limit',
    name: `Add Voters`,
    unit_entitlement: BLOCK_SIZE,
    unit_amount: PRICE_PER_BLOCK_CENTS,
    entitlementLabel: 'voter limit',
    priceData(quantity) {
        const blocks = quantity === 1 ? '1 block' : `${quantity} blocks`;
        return {
            currency: 'usd',
            unit_amount: this.unit_amount,
            product_data: {
                name: this.name,
                description: `Adds ${quantity * this.unit_entitlement} voters to your election's voter limit (${blocks} of ${this.unit_entitlement}).`,
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
    voter_limit: voterBlock,
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
        unit_entitlement: product.unit_entitlement,
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
