import { Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';
import useElection from '~/components/ElectionContextProvider';
import { finalizeCostPath } from './paymentsUtils';

// Manage Voters, in drafts with a closed voter list: the count, linking to the cost on Publish & Share. No price here.
export default function FinalizeCostLink({ voterCount }: { voterCount: number }) {
    const { election } = useElection();
    return <Typography variant='body2' sx={{ my: 1 }}>
        {formatCount(voterCount)} voters,{' '}
        <Link component={RouterLink} to={finalizeCostPath(election.election_id)}>see the cost of finalizing</Link>
    </Typography>;
}
