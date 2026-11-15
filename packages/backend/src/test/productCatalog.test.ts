import { itemize } from '@equal-vote/star-vote-shared/config';

// Pure unit tests for the shared catalog's itemize: given an election's roll count and its
// current entitlements, it returns the line items needed to cover the roll.
// Expected values are worked by hand from the spec: 200 voters per block, $10.00 per block.
describe("itemize", () => {
    test("returns no line items when the roll fits within the voter limit", () => {
        expect(itemize({ roll_count: 100 }, { voter_limit: 100 })).toEqual([]);
        expect(itemize({ roll_count: 0 }, { voter_limit: 100 })).toEqual([]);
    });

    test("one voter over the limit needs one block", () => {
        expect(itemize({ roll_count: 101 }, { voter_limit: 100 })).toEqual([
            { entitlement_type: 'voter_limit', quantity: 1, entitlement_amount: 200, unit_amount: 1000 },
        ]);
    });

    test("an exact multiple of the block size needs no extra block", () => {
        expect(itemize({ roll_count: 500 }, { voter_limit: 100 })).toEqual([
            { entitlement_type: 'voter_limit', quantity: 2, entitlement_amount: 400, unit_amount: 1000 },
        ]);
    });

    test("counts blocks from the current limit, including past purchases", () => {
        // limit 300 (100 free + 200 bought), roll 701 → 401 over → 3 blocks
        expect(itemize({ roll_count: 701 }, { voter_limit: 300 })).toEqual([
            { entitlement_type: 'voter_limit', quantity: 3, entitlement_amount: 600, unit_amount: 1000 },
        ]);
    });
});
