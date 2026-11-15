import { Alert } from '@mui/material';

// Add Voters, after paying for an over-limit upload
export default function PaymentReceivedBanner() {
    return <Alert severity='success' sx={{ mb: 2 }}>Payment received. Please re-submit your list.</Alert>;
}
