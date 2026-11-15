import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { ElectionEntitlements } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { CartLineItem, cartTotal } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { formatCents, formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';
import { PrimaryButton, SecondaryButton } from '~/components/styles';
import ItemizedCost from './ItemizedCost';

// An upload after finalize that would go over the voter limit, priced for roll + upload
export interface UploadPayment {
    uploadCount: number;
    rollCount: number; // the roll after the upload
    entitlements: ElectionEntitlements; // what the cart was itemized against
    lineItems: CartLineItem[];
}

interface UploadPaymentDialogProps {
    payment: UploadPayment | null;
    pending?: boolean;
    onCancel: () => void;
    onConfirm: (payment: UploadPayment) => void;
}

// Opens before any voters are added. Unlike the Finalize dialog it shows the table,
// since this is the first time the admin sees the cost.
export default function UploadPaymentDialog({ payment, pending = false, onCancel, onConfirm }: UploadPaymentDialogProps) {
    return <Dialog open={payment !== null} fullWidth maxWidth='sm' onClose={onCancel}>
        {payment && <>
            <DialogTitle>Adding {formatCount(payment.uploadCount)} voters needs a higher voter limit</DialogTitle>
            <DialogContent>
                <Typography sx={{ mb: 2 }}>
                    This would bring your list to {formatCount(payment.rollCount)} voters, over your limit
                    of {formatCount(payment.entitlements.voter_limit)}. Your voters won&apos;t be added yet: after
                    paying, you&apos;ll come back here to re-submit your list.
                </Typography>
                <ItemizedCost
                    lineItems={payment.lineItems}
                    rollCount={payment.rollCount}
                    entitlements={payment.entitlements}
                />
            </DialogContent>
            <DialogActions>
                <SecondaryButton type='button' fullWidth={false} onClick={onCancel}>Cancel</SecondaryButton>
                <PrimaryButton type='button' fullWidth={false} disabled={pending} onClick={() => onConfirm(payment)}>
                    Proceed to payment ({formatCents(cartTotal(payment.lineItems))})
                </PrimaryButton>
            </DialogActions>
        </>}
    </Dialog>;
}
