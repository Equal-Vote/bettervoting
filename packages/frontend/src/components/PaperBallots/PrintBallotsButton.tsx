import { useState } from 'react';
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { formatBallotId, makeBallotIds } from './ballotIds';

const MAX_COPIES = 500;
// The template fits this many candidates on one page; more run onto a second page.
const CANDIDATES_PER_PAGE = 12;

interface PrintBallotsButtonProps {
    // Shown on the batch's cover page, e.g. the election and race titles.
    title: string;
    candidates: string[];
    // Prepended to each ballot ID in its QR code, e.g. "bv:<election>:<race>:", so a
    // scanned ballot says which election and race it belongs to.
    qrPrefix: string;
    fileName: string;
}

const downloadPdf = (pdf: Uint8Array, fileName: string) => {
    // Copy into a plain ArrayBuffer-backed array; Blob won't take one that could be shared memory.
    const url = URL.createObjectURL(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

// A small "Print paper ballots" button that opens a dialog asking how many copies to
// print, then downloads a PDF of STAR ballots, each with its own ID and QR code.
export default function PrintBallotsButton({ title, candidates, qrPrefix, fileName }: PrintBallotsButtonProps) {
    const [open, setOpen] = useState(false);
    const [copies, setCopies] = useState('10');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const count = Number(copies);
    const validCount = Number.isInteger(count) && count >= 1 && count <= MAX_COPIES;

    const close = () => {
        if (busy) return;
        setOpen(false);
        setError('');
    };

    const print = async () => {
        setBusy(true);
        setError('');
        try {
            const ballots = makeBallotIds(count).map(id => ({ id: formatBallotId(id), qr: `${qrPrefix}${id}` }));
            // Loaded on demand: the Typst compiler is large.
            const { renderStarBallotsPdf } = await import('./renderBallotsPdf');
            const printed = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            downloadPdf(await renderStarBallotsPdf({ title, printed, candidates, ballots }), fileName);
            setOpen(false);
        } catch (err) {
            console.error(err);
            setError('Something went wrong while making the PDF. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Button size='small' startIcon={<PrintIcon />} onClick={() => setOpen(true)} disabled={candidates.length === 0}>
                Print paper ballots
            </Button>
            <Dialog open={open} onClose={close} maxWidth='xs' fullWidth>
                <DialogTitle>Print paper ballots</DialogTitle>
                <DialogContent>
                    <Typography variant='body2' sx={{ mb: 2 }}>
                        Download a PDF of STAR ballots, one per page. Each copy gets its own ballot ID, printed as
                        text and as a QR code, so a copied or double-scanned ballot can be caught when the ballots are
                        counted. The first page lists every ID in the batch; keep it with the ballots.
                    </Typography>
                    <TextField
                        id='print-ballots-copies'
                        label='Number of copies'
                        type='number'
                        value={copies}
                        onChange={e => setCopies(e.target.value)}
                        slotProps={{ htmlInput: { min: 1, max: MAX_COPIES } }}
                        error={!validCount}
                        helperText={validCount ? ' ' : `Enter a whole number from 1 to ${MAX_COPIES}`}
                        disabled={busy}
                        fullWidth
                    />
                    {candidates.length > CANDIDATES_PER_PAGE && (
                        <Alert severity='info' sx={{ mt: 1 }}>
                            With more than {CANDIDATES_PER_PAGE} candidates, each ballot runs onto a second page.
                            The ballot ID and QR code are on the first page.
                        </Alert>
                    )}
                    {error && <Alert severity='error' sx={{ mt: 1 }}>{error}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} disabled={busy}>Cancel</Button>
                    <Button variant='contained' onClick={print} disabled={!validCount || busy}
                        startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <PrintIcon />}>
                        {busy ? 'Preparing…' : 'Download PDF'}
                    </Button>
                </DialogActions>
                {busy && (
                    <Box sx={{ px: 3, pb: 2 }}>
                        <Typography variant='caption' color='text.secondary'>
                            The first PDF takes a little longer while the ballot maker loads.
                        </Typography>
                    </Box>
                )}
            </Dialog>
        </>
    );
}
