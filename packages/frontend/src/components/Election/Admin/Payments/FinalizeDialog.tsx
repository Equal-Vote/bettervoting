import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { CartLineItem, cartTotal } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { formatCents } from '@equal-vote/star-vote-shared/utils/numberFormat';
import useElection from '~/components/ElectionContextProvider';
import { PrimaryButton, SecondaryButton } from '~/components/styles';
import { electionTermTitle } from './paymentsUtils';

interface FinalizeDialogProps {
    open: boolean;
    lineItems: CartLineItem[]; // empty when nothing is owed
    pending?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

// The Finalize confirmation. Nothing owed: today's confirm. Owed: the same warning, and the button goes to payment.
// No table here: the admin has just seen it above the Finalize button.
// Like today's confirm, it can't be dismissed by clicking outside it.
export default function FinalizeDialog({ open, lineItems, pending = false, onCancel, onConfirm }: FinalizeDialogProps) {
    const { t, election } = useElection();
    const total = cartTotal(lineItems);
    const owed = total > 0;
    return <Dialog open={open} fullWidth>
        <DialogTitle>
            {owed ? `Finalize ${electionTermTitle(election.settings)}` : t('admin_home.finalize_confirm.title')}
        </DialogTitle>
        <DialogContent>
            <DialogContentText>{t('admin_home.finalize_confirm.message')}</DialogContentText>
        </DialogContent>
        <DialogActions>
            <SecondaryButton type='button' fullWidth={false} onClick={onCancel}>
                {t('keyword.cancel')}
            </SecondaryButton>
            <PrimaryButton type='button' fullWidth={false} disabled={pending} onClick={onConfirm}>
                {owed ? `Proceed to payment (${formatCents(total)})` : t('keyword.submit')}
            </PrimaryButton>
        </DialogActions>
    </Dialog>;
}
