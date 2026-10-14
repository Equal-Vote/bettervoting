import { Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { VoterEmail } from "@equal-vote/star-vote-shared/domain_model/EmailSend";
import useElection from "../../ElectionContextProvider";
import { getLocalTimeZoneShort } from "../../util";
import { describeVoterEmail, EMAIL_STATUS_DISPLAY } from "./emailStatusDisplay";

// Every email sent to one voter, newest first, with where each one stands.
const VoterEmailsTable = ({ emails }: { emails?: VoterEmail[] }) => {
    const { t } = useElection();
    if (!emails || emails.length === 0) return null;
    return (
        <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Emails</Typography>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="emails to this voter">
                    <TableHead>
                        <TableRow>
                            <TableCell>Email</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">{`Sent (${getLocalTimeZoneShort()})`}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {emails.map(email => (
                            <TableRow key={email.send_id}>
                                <TableCell>
                                    {describeVoterEmail(email.kind)}
                                    {email.subject && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{email.subject}</Typography>}
                                </TableCell>
                                <TableCell>
                                    <Chip size="small" label={EMAIL_STATUS_DISPLAY[email.status].label} color={EMAIL_STATUS_DISPLAY[email.status].chip} />
                                </TableCell>
                                <TableCell align="right">{t('listed_datetime', { listed_datetime: new Date(email.created_at).getTime() })}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default VoterEmailsTable;
