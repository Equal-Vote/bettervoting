import { Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ElectionRollResponse } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { getLocalTimeZoneShort } from "../../util";
import useElection from "../../ElectionContextProvider";
import { Tip } from "~/components/styles";

type Props = {
    history?: ElectionRollResponse['history'];
    emailEvents?: ElectionRollResponse['email_events'];
};

// 'brand' isn't a Chip color; it's rendered via sx with the theme's brand purple.
type ChipColor = "success" | "error" | "warning" | "info" | "primary" | "brand" | "default";

type ActivityRow = {
    action: string;
    actor: string;
    timestamp: number;
    sortKey: number;
    color: ChipColor;
    isEmail: boolean;
    details?: string[];
};

const EMAIL_ACTOR = 'Email Server';

// A blast's history entry (campaign_N) is written after SendGrid accepts the
// message, so its email events can carry slightly earlier timestamps. Nudge email
// events later when sorting (display keeps the real time) so each campaign
// lists before its own events.
const EMAIL_SORT_OFFSET_MS = 20_000;

// Only final delivery outcomes get a color; intermediate states (sent,
// processed, deferred) stay gray so they don't compete with human actions.
const emailEventColor = (event_type: string): ChipColor => {
    switch (event_type) {
        case 'delivered': return 'success';
        case 'open': return 'success';
        case 'bounce': return 'error';
        case 'dropped': return 'error';
        case 'spamreport': return 'error';
        default: return 'default';
    }
};

// Roll history actions are written by admins and voters. Blasts record the
// campaign's message_id (e.g. campaign_1) as the action, so match by prefix.
const historyActionColor = (action_type: string): ChipColor => {
    if (action_type.includes('VOTER_ID_REVEALED')) return 'error';
    if (action_type.endsWith('failed')) return 'error';
    if (action_type.startsWith('campaign_') || action_type.startsWith('email invite sent')) return 'info';
    switch (action_type) {
        case 'submit':
        case 'update':
        case 'submitted_via_admin':
        case 'submitted_via_browser': return 'primary';
        case 'added': return 'brand';
        case 'approved': return 'success';
        case 'flagged': return 'warning';
        case 'invalid': return 'error';
        default: return 'default';
    }
};

const emailEventDetails = (details?: Record<string, unknown>): string[] => {
    const lines: string[] = [];
    if (details?.reason) lines.push(String(details.reason));
    if (details?.response) lines.push(String(details.response));
    if (details?.status) lines.push(`Status: ${String(details.status)}`);
    return lines;
};

const RollActivityTable = ({ history, emailEvents }: Props) => {
    const { t } = useElection();

    const rows: ActivityRow[] = [
        ...(history ?? []).map((h) => ({
            action: h.action_type,
            actor: h.actor,
            timestamp: new Date(h.timestamp).getTime(),
            sortKey: new Date(h.timestamp).getTime(),
            color: historyActionColor(h.action_type),
            isEmail: false,
        })),
        ...(emailEvents ?? []).map((e) => ({
            action: `email ${e.event_type}`,
            actor: EMAIL_ACTOR,
            timestamp: new Date(e.event_timestamp).getTime(),
            sortKey: new Date(e.event_timestamp).getTime() + EMAIL_SORT_OFFSET_MS,
            color: emailEventColor(e.event_type),
            isEmail: true,
            details: emailEventDetails(e.details),
        })),
    ].sort((a, b) => a.sortKey - b.sortKey);

    if (rows.length === 0) return null;

    return (
        <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Voter Activity
            </Typography>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="voter activity">
                    <TableHead>
                        <TableRow>
                            <TableCell>Action</TableCell>
                            <TableCell align="right">Actor</TableCell>
                            <TableCell align="right">{`Timestamp (${getLocalTimeZoneShort()})`}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, i) => (
                            // Email rows are muted (outlined chip, secondary text) so the
                            // filled chips of admin/voter actions stand out.
                            <TableRow key={i} sx={row.isEmail ? { '& .MuiTableCell-root': { color: 'text.secondary' } } : undefined}>
                                <TableCell component="th" scope="row">
                                    <Chip
                                        label={row.action}
                                        color={row.color === 'brand' ? 'default' : row.color}
                                        size="small"
                                        variant={row.isEmail ? 'outlined' : 'filled'}
                                        sx={row.color === 'brand' ? { bgcolor: 'brand.purple', color: '#fff' } : undefined}
                                    />
                                    {row.details && row.details.length > 0 &&
                                        <Tip content={{
                                            title: row.action,
                                            description: <>{row.details.map((line, j) => <div key={j}>{line}</div>)}</>,
                                        }} />
                                    }
                                </TableCell>
                                <TableCell align="right">{row.actor}</TableCell>
                                <TableCell align="right">{t('listed_datetime', { listed_datetime: row.timestamp })}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default RollActivityTable;
