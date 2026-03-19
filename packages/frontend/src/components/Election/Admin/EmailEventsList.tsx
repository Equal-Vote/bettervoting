import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip } from "@mui/material";
import { getLocalTimeZoneShort } from "../../util";
import useElection from "../../ElectionContextProvider";

type EmailEventData = {
    event_type: string;
    event_timestamp: number;
    details?: Record<string, unknown>;
};

const eventChipColor = (event_type: string): "success" | "error" | "warning" | "info" | "default" => {
    switch (event_type) {
        case 'delivered': return 'success';
        case 'open': return 'success';
        case 'bounce': return 'error';
        case 'dropped': return 'error';
        case 'spamreport': return 'error';
        case 'deferred': return 'warning';
        case 'sent': return 'info';
        case 'processed': return 'info';
        default: return 'default';
    }
};

type Props = {
    events: EmailEventData[];
};

const EmailEventsList = ({ events }: Props) => {
    const { t } = useElection();

    if (!events || events.length === 0) {
        return (
            <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>
                No email delivery data available.
            </Typography>
        );
    }

    return (
        <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Email Delivery Events
            </Typography>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Event</TableCell>
                            <TableCell>{`Time (${getLocalTimeZoneShort()})`}</TableCell>
                            <TableCell>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {events.map((event, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Chip
                                        label={event.event_type}
                                        color={eventChipColor(event.event_type)}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    {t('listed_datetime', { listed_datetime: new Date(Number(event.event_timestamp)) })}
                                </TableCell>
                                <TableCell>
                                    {event.details?.reason && String(event.details.reason)}
                                    {event.details?.response && String(event.details.response)}
                                    {event.details?.status && ` (${String(event.details.status)})`}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default EmailEventsList;
