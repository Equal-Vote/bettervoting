import { PaymentRequired } from "@curveball/http-errors";
import { pricingConfig } from "@equal-vote/star-vote-shared/config";

// Deliberately narrow special case: every other error in this app is a flat
// `{ error: string }` (see errorCatchMiddleware). This one carries the extra
// fields the frontend needs to offer a voter-limit purchase instead of a snackbar.
export class VoterLimitPaymentRequired extends PaymentRequired {
    readonly code = 'PAYMENT_REQUIRED';
    readonly blockSize = pricingConfig.BLOCK_SIZE;
    readonly pricePerBlockCents = pricingConfig.PRICE_PER_BLOCK_CENTS;

    constructor(readonly currentVoterLimit: number, readonly requestedVoterCount: number) {
        super(`Request Denied: this election is limited to ${currentVoterLimit} voters`);
    }

    responseFields() {
        return {
            code: this.code,
            currentVoterLimit: this.currentVoterLimit,
            requestedVoterCount: this.requestedVoterCount,
            blockSize: this.blockSize,
            pricePerBlockCents: this.pricePerBlockCents,
        };
    }
}
