import { cartTotal, checkoutSummary, entitlementsAfter, itemize } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';

// Pure unit tests for the shared catalog's itemize: given an election's roll count and its
// current entitlements, it returns the line items needed to cover the roll.
// Expected values are worked by hand from the spec: 100 voters per block, $6.00 per block.
describe("itemize", () => {
    test("returns no line items when the roll fits within the voter limit", () => {
        expect(itemize({ roll_count: 100 }, { voter_limit: 100 })).toEqual([]);
        expect(itemize({ roll_count: 0 }, { voter_limit: 100 })).toEqual([]);
    });

    test("one voter over the limit needs one block", () => {
        expect(itemize({ roll_count: 101 }, { voter_limit: 100 })).toEqual([
            { entitlement_type: 'voter_limit', quantity: 1, unit_entitlement: 100, unit_amount: 600 },
        ]);
    });

    test("an exact multiple of the block size needs no extra block", () => {
        expect(itemize({ roll_count: 500 }, { voter_limit: 100 })).toEqual([
            { entitlement_type: 'voter_limit', quantity: 4, unit_entitlement: 100, unit_amount: 600 },
        ]);
    });

    test("counts blocks from the current limit, including past purchases", () => {
        // limit 300 (100 free + 200 bought), roll 701 → 401 over → 5 blocks
        expect(itemize({ roll_count: 701 }, { voter_limit: 300 })).toEqual([
            { entitlement_type: 'voter_limit', quantity: 5, unit_entitlement: 100, unit_amount: 600 },
        ]);
    });
});

describe("checkoutSummary", () => {
    const line = { entitlement_type: 'voter_limit' as const, quantity: 3, unit_entitlement: 200 };

    test("names the election and where its voter limit ends up", () => {
        expect(checkoutSummary('Board Election 2027', [line], { voter_limit: 100 }))
            .toBe('Increase voter limit from 100 to 700 for election "Board Election 2027".');
    });

    test("adds up lines of the same type into one change", () => {
        expect(checkoutSummary('Poll', [line, { ...line, quantity: 1 }], { voter_limit: 300 }))
            .toBe('Increase voter limit from 300 to 1100 for election "Poll".');
    });

    test("cuts a long title", () => {
        const summary = checkoutSummary('x'.repeat(500), [line], { voter_limit: 100 });
        expect(summary).toBe(`Increase voter limit from 100 to 700 for election "${'x'.repeat(199)}…".`);
    });
});

describe("cartTotal", () => {
    test("sums every line's quantity times its unit price, in cents", () => {
        expect(cartTotal([])).toBe(0);
        expect(cartTotal([
            { entitlement_type: 'voter_limit', quantity: 256, unit_entitlement: 100, unit_amount: 600 },
        ])).toBe(153600);
        expect(cartTotal([
            { entitlement_type: 'voter_limit', quantity: 2, unit_entitlement: 100, unit_amount: 600 },
            { entitlement_type: 'voter_limit', quantity: 1, unit_entitlement: 100, unit_amount: 600 },
        ])).toBe(1800);
    });
});

describe("entitlementsAfter", () => {
    test("is the current entitlements plus what each line grants", () => {
        // 100 free + 200 bought, buying 5 more blocks of 100 → 800
        expect(entitlementsAfter({ voter_limit: 300 }, [
            { entitlement_type: 'voter_limit', quantity: 5, unit_entitlement: 100, unit_amount: 600 },
        ])).toEqual({ voter_limit: 800 });
    });

    test("an empty cart changes nothing", () => {
        expect(entitlementsAfter({ voter_limit: 100 }, [])).toEqual({ voter_limit: 100 });
    });

    test("doesn't modify the entitlements it's given", () => {
        const current = { voter_limit: 100 };
        entitlementsAfter(current, [{ entitlement_type: 'voter_limit', quantity: 1, unit_entitlement: 100, unit_amount: 600 }]);
        expect(current).toEqual({ voter_limit: 100 });
    });
});
