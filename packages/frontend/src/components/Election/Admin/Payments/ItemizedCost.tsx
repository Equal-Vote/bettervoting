import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { ElectionEntitlements } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { CartLineItem, cartTotal, productCatalog } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { pricingConfig } from '@equal-vote/star-vote-shared/config';
import { formatCents, formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';

const { FREE_TIER_LIMIT } = pricingConfig;

const headerCell = {
    bgcolor: 'action.hover',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'text.secondary',
};

interface ItemizedCostProps {
    lineItems: CartLineItem[];
    rollCount: number; // the voters being priced, including any pending upload
    entitlements: ElectionEntitlements; // what the election has before this cart
    title?: string; // left out in a dialog, which has its own title
}

// The itemized cost table: free tier, what's already paid for, one row per catalog line item, and the total.
// No service-fee disclaimer here: Stripe's checkout page shows it (custom_text.after_submit), and so does the receipt.
export default function ItemizedCost({ lineItems, rollCount, entitlements, title }: ItemizedCostProps) {
    const alreadyPaid = entitlements.voter_limit - FREE_TIER_LIMIT;
    return <Box>
        <Box sx={{ display: 'flex', justifyContent: title ? 'space-between' : 'flex-end', alignItems: 'baseline', mb: 1, gap: 2 }}>
            {title && <Typography variant='h6'>{title}</Typography>}
            <Typography variant='body2' color='text.secondary'>Based on <b>{formatCount(rollCount)}</b> voters</Typography>
        </Box>
        <Table size='small' aria-label={title ?? 'Itemized cost'}>
            <TableHead>
                <TableRow>
                    <TableCell sx={headerCell}>Item</TableCell>
                    <TableCell sx={headerCell} align='right'>Quantity</TableCell>
                    <TableCell sx={headerCell} align='right'>Amount</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                <TableRow>
                    <TableCell>Free tier (first {formatCount(FREE_TIER_LIMIT)} voters)</TableCell>
                    <TableCell />
                    <TableCell align='right'>Free</TableCell>
                </TableRow>
                {alreadyPaid > 0 && <TableRow>
                    <TableCell>Already paid ({formatCount(alreadyPaid)} voters)</TableCell>
                    <TableCell />
                    <TableCell align='right'>Paid</TableCell>
                </TableRow>}
                {lineItems.map((line, i) => {
                    const from = entitlements[line.entitlement_type];
                    const to = from + line.quantity * line.unit_entitlement;
                    return <TableRow key={`${line.entitlement_type}-${i}`}>
                        <TableCell>
                            {productCatalog[line.entitlement_type].name}
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                                From {formatCount(from)} to {formatCount(to)} · {formatCents(line.unit_amount)} per {formatCount(line.unit_entitlement)}
                            </Typography>
                        </TableCell>
                        <TableCell align='right'>{formatCount(line.quantity)} × {formatCents(line.unit_amount)}</TableCell>
                        <TableCell align='right'>{formatCents(line.quantity * line.unit_amount)}</TableCell>
                    </TableRow>;
                })}
                <TableRow sx={{ '& td': { borderBottom: 0 } }}>
                    <TableCell colSpan={2}><b>Total</b></TableCell>
                    <TableCell align='right'><b>{formatCents(cartTotal(lineItems))}</b></TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </Box>;
}
