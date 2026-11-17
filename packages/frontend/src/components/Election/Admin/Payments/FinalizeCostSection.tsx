import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { ElectionEntitlements } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { CartLineItem } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { pricingConfig } from '@equal-vote/star-vote-shared/config';
import { formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';
import useElection from '~/components/ElectionContextProvider';
import ItemizedCost from './ItemizedCost';
import { electionTermTitle, FINALIZE_COST_ID } from './paymentsUtils';

interface FinalizeCostSectionProps {
    lineItems: CartLineItem[];
    rollCount: number;
    entitlements: ElectionEntitlements;
}

// Publish & Share, above Finalize: the itemized cost, or a one-line note when nothing is owed
export default function FinalizeCostSection({ lineItems, rollCount, entitlements }: FinalizeCostSectionProps) {
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
                    title={`Cost to Finalize ${electionTermTitle(election.settings)}`}
                />
            </Box>
        }
    </Box>;
}
