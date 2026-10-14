import { useEffect } from "react";
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { EMAIL_STATUSES, EmailSendSummary } from "@equal-vote/star-vote-shared/domain_model/EmailSend";
import { useGetEmailSends } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import { getLocalTimeZoneShort } from "../../util";
import { describeSend, EMAIL_STATUS_DISPLAY } from "./emailStatusDisplay";

// While any email is still queued or sending, refresh this often so the bars move.
const REFRESH_MS = 15_000;

const inProgress = (send: EmailSendSummary) => send.counts.queued + send.counts.sending > 0;

// One bar per send, split into queued / sending / delivered / failed.
const SendProgress = ({ send }: { send: EmailSendSummary }) => {
    const total = EMAIL_STATUSES.reduce((n, s) => n + send.counts[s], 0);
    if (total === 0) return null;
    return (
        <Box>
            <Box sx={{ display: 'flex', height: 10, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.200' }}
                role="img" aria-label={EMAIL_STATUSES.map(s => `${send.counts[s]} ${EMAIL_STATUS_DISPLAY[s].label.toLowerCase()}`).join(', ')}>
                {EMAIL_STATUSES.filter(s => send.counts[s] > 0).map(s => (
                    <Tooltip key={s} title={`${EMAIL_STATUS_DISPLAY[s].label}: ${send.counts[s]}`}>
                        <Box sx={{ width: `${100 * send.counts[s] / total}%`, bgcolor: EMAIL_STATUS_DISPLAY[s].bar }} />
                    </Tooltip>
                ))}
            </Box>
            <Typography variant="caption" color="text.secondary">
                {EMAIL_STATUSES.filter(s => send.counts[s] > 0)
                    .map(s => `${Math.round(100 * send.counts[s] / total)}% ${EMAIL_STATUS_DISPLAY[s].label.toLowerCase()}`)
                    .join(' · ')}
            </Typography>
        </Box>
    );
};

// Every email send for the election, newest first, with delivery progress.
// `refreshKey` changes when the admin starts a new send, so the list picks it up.
const EmailSendsList = ({ refreshKey }: { refreshKey?: unknown }) => {
    const { election, t } = useElection();
    const { data, makeRequest } = useGetEmailSends(election.election_id);

    useEffect(() => { makeRequest(); }, [election.election_id, refreshKey]);

    const anyInProgress = data?.sends.some(inProgress) ?? false;
    useEffect(() => {
        if (!anyInProgress) return;
        const timer = setInterval(() => makeRequest(), REFRESH_MS);
        return () => clearInterval(timer);
    }, [anyInProgress]);

    if (!data || data.sends.length === 0) return null;

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 1 }}>Sent emails</Typography>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="sent emails">
                    <TableHead>
                        <TableRow>
                            <TableCell>{`Sent (${getLocalTimeZoneShort()})`}</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell align="right">Recipients</TableCell>
                            <TableCell sx={{ minWidth: 200 }}>Delivery</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.sends.map(send => (
                            <TableRow key={send.send_id}>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    {t('listed_datetime', { listed_datetime: new Date(send.created_at).getTime() })}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{send.sent_by}</Typography>
                                </TableCell>
                                <TableCell>
                                    {describeSend(send.kind, send.audience)}
                                    {send.subject && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{send.subject}</Typography>}
                                </TableCell>
                                <TableCell align="right">{send.recipient_count}</TableCell>
                                <TableCell><SendProgress send={send} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default EmailSendsList;
