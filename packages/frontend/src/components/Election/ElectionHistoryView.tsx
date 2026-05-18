import { useEffect } from "react";
import { Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import useElection from "../ElectionContextProvider";
import { HistoryEvent, useGetElectionHistory } from "../../hooks/useAPI";

const chipColor = (type: HistoryEvent['type']): "success" | "error" | "warning" | "info" | "default" => {
    switch (type) {
        case 'finalization_summary': return 'default';
        case 'state_change': return 'info';
        case 'preliminary_results_change': return 'warning';
        case 'ballots_milestone': return 'success';
        case 'rolls_milestone': return 'success';
        case 'ballots_edited_milestone': return 'warning';
        case 'voter_id_revealed': return 'error';
        default: return 'default';
    }
};

const chipLabel = (type: HistoryEvent['type'], t: (k: string) => string): string => {
    switch (type) {
        case 'finalization_summary': return t('election_history.chip.finalized');
        case 'state_change': return t('election_history.chip.state_change');
        case 'preliminary_results_change': return t('election_history.chip.preliminary_results');
        case 'ballots_milestone': return t('election_history.chip.ballots');
        case 'rolls_milestone': return t('election_history.chip.rolls');
        case 'ballots_edited_milestone': return t('election_history.chip.edits');
        case 'voter_id_revealed': return t('election_history.chip.reveal');
        default: return type;
    }
};

const describe = (event: HistoryEvent, t: (k: string, v?: object) => string): string => {
    switch (event.type) {
        case 'finalization_summary':
            return event.voter_ids_revealed_at_finalization > 0
                ? t('election_history.desc.finalization_summary_with_reveals', {
                    rolls: event.rolls_at_finalization,
                    reveals: event.voter_ids_revealed_at_finalization,
                })
                : t('election_history.desc.finalization_summary', {
                    rolls: event.rolls_at_finalization,
                });
        case 'state_change':
            return event.from === null
                ? t('election_history.desc.state_initial', { to: event.to })
                : t('election_history.desc.state_change', { from: event.from, to: event.to });
        case 'preliminary_results_change':
            return event.to
                ? t('election_history.desc.preliminary_on')
                : t('election_history.desc.preliminary_off');
        case 'ballots_milestone':
            return t('election_history.desc.ballots_milestone', { count: event.count });
        case 'rolls_milestone':
            return t('election_history.desc.rolls_milestone', { count: event.count });
        case 'ballots_edited_milestone':
            return t('election_history.desc.edits_milestone', { count: event.count });
        case 'voter_id_revealed':
            return t('election_history.desc.voter_revealed');
        default:
            return '';
    }
};

// Voter-related events arrive day-rounded from the backend; show date only.
// Admin events keep precise timestamps; show date + time.
const isDayRounded = (type: HistoryEvent['type']) =>
    type === 'ballots_milestone' ||
    type === 'rolls_milestone' ||
    type === 'ballots_edited_milestone' ||
    type === 'voter_id_revealed';

const formatTimestamp = (event: HistoryEvent, t: (k: string, v?: object) => string): string => {
    const date = new Date(event.timestamp);
    if (isDayRounded(event.type)) {
        return date.toLocaleDateString();
    }
    return t('listed_datetime', { listed_datetime: date });
};

const ElectionHistoryView = () => {
    const { election, t } = useElection();
    const { data, isPending, error, makeRequest: getHistory } = useGetElectionHistory(election?.election_id);

    useEffect(() => {
        if (election?.election_id) getHistory();
    }, [election?.election_id]);

    return (
        <Box display="flex" justifyContent="center" sx={{ width: "100%" }}>
            <Box sx={{ width: "100%", maxWidth: "900px", m: { xs: 0, m: 2 }, p: { xs: 1, m: 2 } }}>
                <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
                    {t('election_history.title')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                    {t('election_history.subtitle')}
                </Typography>

                {isPending && <Typography>{t('election_history.loading')}</Typography>}

                {error && (
                    <Typography color="text.secondary">
                        {t('election_history.not_finalized')}
                    </Typography>
                )}

                {data && data.events.length === 0 && (
                    <Typography color="text.secondary">{t('election_history.empty')}</Typography>
                )}

                {data && data.events.length > 0 && (
                    <>
                        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                            {t('election_history.ladder_note')}
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('election_history.col.event')}</TableCell>
                                        <TableCell>{t('election_history.col.description')}</TableCell>
                                        <TableCell>{t('election_history.col.when')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.events.map((event, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Chip
                                                    label={chipLabel(event.type, t)}
                                                    color={chipColor(event.type)}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>{describe(event, t)}</TableCell>
                                            <TableCell>{formatTimestamp(event, t)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default ElectionHistoryView;
