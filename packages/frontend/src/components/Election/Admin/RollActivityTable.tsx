import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ElectionRollResponse } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { getLocalTimeZoneShort } from "../../util";
import useElection from "../../ElectionContextProvider";
import { Tip } from "~/components/styles";

type Props = {
    history?: ElectionRollResponse['history'];
    emailEvents?: ElectionRollResponse['email_events'];
};

type ActivityRow = {
    action: string;
    actor: string;
    timestamp: number;
    details?: string[];
};

const EMAIL_ACTOR = 'Email Server';

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
        })),
        ...(emailEvents ?? []).map((e) => ({
            action: e.event_type,
            actor: EMAIL_ACTOR,
            timestamp: new Date(e.event_timestamp).getTime(),
            details: emailEventDetails(e.details),
        })),
    ].sort((a, b) => a.timestamp - b.timestamp);

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
                            <TableRow key={i}>
                                <TableCell component="th" scope="row">
                                    {row.action}
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
