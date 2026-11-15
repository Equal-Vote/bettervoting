import { Alert, Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { pricingConfig } from '@equal-vote/star-vote-shared/config';
import { formatCents, formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';
import useElection from '~/components/ElectionContextProvider';
import { FINALIZE_COST_ID } from './FinalizeCost';

const finalizeCostPath = (election_id: string) => `/${election_id}/admin/publish#${FINALIZE_COST_ID}`;

// Manage Voters, in drafts with a closed voter list: the count, linking to the cost on Publish & Share. No price here.
export function FinalizeCostLink({ voterCount }: { voterCount: number }) {
    const { election } = useElection();
    return <Typography variant='body2' sx={{ my: 1 }}>
        {formatCount(voterCount)} voters,{' '}
        <Link component={RouterLink} to={finalizeCostPath(election.election_id)}>see the cost of finalizing</Link>
    </Typography>;
}

// The bottom of the Add Voters form
export function AddVotersPricingNote() {
    const { election } = useElection();
    const { FREE_TIER_LIMIT, BLOCK_SIZE, PRICE_PER_BLOCK_CENTS } = pricingConfig;
    return <Box sx={{ mt: 2, mb: 1 }}>
        <Typography variant='body2' color='text.secondary' align='center'>
            The first {formatCount(FREE_TIER_LIMIT)} voters are covered by the free tier, and additional voters are
            charged at {formatCents(PRICE_PER_BLOCK_CENTS)} per {formatCount(BLOCK_SIZE)} voters.
            {election.state === 'draft' && <>
                {' '}View your ongoing quote under{' '}
                <Link component={RouterLink} to={finalizeCostPath(election.election_id)}>Publish &amp; Share</Link>
            </>}
        </Typography>
        <Typography variant='body2' color='text.secondary' align='center' sx={{ mt: 1 }}>
            For elections above 10,000 voters we also recommend reaching out to{' '}
            <Link href='mailto:elections@equal.vote'>elections@equal.vote</Link> so our team is aware.
        </Typography>
    </Box>;
}

// Add Voters, after paying for an over-limit upload
export function PaymentReceivedBanner() {
    return <Alert severity='success' sx={{ mb: 2 }}>Payment received. Please re-submit your list.</Alert>;
}
