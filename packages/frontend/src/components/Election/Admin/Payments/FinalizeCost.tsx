import { Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { ElectionEntitlements } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { CartLineItem, cartTotal } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { pricingConfig } from '@equal-vote/star-vote-shared/config';
import { formatCents, formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';
import useElection from '~/components/ElectionContextProvider';
import { PrimaryButton, SecondaryButton } from '~/components/styles';
import ItemizedCost from './ItemizedCost';

export const FINALIZE_COST_ID = 'finalize-cost';

// "Poll" or "Election", following the election's term_type
export const capitalTerm = (settings: { term_type?: string }) => settings.term_type === 'poll' ? 'Poll' : 'Election';

interface FinalizeCostSectionProps {
    lineItems: CartLineItem[];
    rollCount: number;
    entitlements: ElectionEntitlements;
}

// Publish & Share, above Finalize: the itemized cost, or a one-line note when nothing is owed
export function FinalizeCostSection({ lineItems, rollCount, entitlements }: FinalizeCostSectionProps) {
    const { election } = useElection();
    const coveredBy = entitlements.voter_limit > pricingConfig.FREE_TIER_LIMIT ? 'your voter limit' : 'the free tier';
    return <Box id={FINALIZE_COST_ID} sx={{ mt: 2, p: 1, scrollMarginTop: 80 }}>
        {lineItems.length === 0
            ? <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon color='success' fontSize='small' />
                <Typography variant='body1'>
                    No cost to finalize: your {formatCount(rollCount)} voters are covered by {coveredBy}.
                </Typography>
            </Box>
            : <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <ItemizedCost
                    lineItems={lineItems}
                    rollCount={rollCount}
                    entitlements={entitlements}
                    title={`Cost to Finalize ${capitalTerm(election.settings)}`}
                />
            </Box>
        }
    </Box>;
}

interface FinalizeDialogProps {
    open: boolean;
    lineItems: CartLineItem[]; // empty when nothing is owed
    pending?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

// The Finalize confirmation. Nothing owed: today's confirm. Owed: the same warning, and the button goes to payment.
// No table here: the admin has just seen it above the Finalize button.
export function FinalizeDialog({ open, lineItems, pending = false, onCancel, onConfirm }: FinalizeDialogProps) {
    const { t, election } = useElection();
    const total = cartTotal(lineItems);
    const owed = total > 0;
    return <Dialog open={open} fullWidth onClose={onCancel}>
        <DialogTitle>
            {owed ? `Finalize ${capitalTerm(election.settings)}` : t('admin_home.finalize_confirm.title')}
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
