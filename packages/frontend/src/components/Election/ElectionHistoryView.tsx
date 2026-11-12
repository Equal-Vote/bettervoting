import { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import useElection from "../ElectionContextProvider";
import { useGetElectionHistory } from "../../hooks/useAPI";
import EnhancedTable from "../EnhancedTable";
import { electionHasAuditLog } from "@equal-vote/star-vote-shared/domain_model/AuditLog";

const ElectionHistoryView = () => {
    const { election, permissions, t } = useElection();
    const { data, isPending, error, makeRequest: getHistory } = useGetElectionHistory(election?.election_id);
    // Elections created before the cutoff have no public log: the backend
    // serves it only to the election's admins. Don't ask on behalf of anyone
    // else, so the page explains why instead of showing an error.
    const isPublic = electionHasAuditLog(election);
    const isAdmin = !!permissions?.includes('canEditElection');
    const hasAuditLog = isPublic || isAdmin;
    // The server lists events in the order they happened, by exact time. Several events
    // show only their day, so the table sorts the When column by this position instead of
    // by the text it displays.
    const events = useMemo(() => (data?.events ?? []).map((event, i) => ({ ...event, position: i })), [data]);

    useEffect(() => {
        if (election?.election_id && hasAuditLog) getHistory();
    }, [election?.election_id, hasAuditLog]);

    return (
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Box sx={{ width: "100%", maxWidth: "900px", m: { xs: 0, m: 2 }, p: { xs: 1, m: 2 } }}>
                <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
                    {t('election_history.title')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {t('election_history.subtitle')}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                    {t('election_history.ladder_note')}
                </Typography>

                <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold', color: isPublic ? 'text.secondary' : 'warning.main' }}>
                    {t(isPublic ? 'election_history.public' : 'election_history.admin_only')}
                </Typography>

                {hasAuditLog && error && (
                    <Typography color="text.secondary">
                        {t('election_history.not_finalized')}
                    </Typography>
                )}

                {hasAuditLog && !error && (
                    <EnhancedTable
                        title={t('election_history.title')}
                        hideTitle
                        headKeys={['history_event', 'history_description', 'history_note', 'history_when']}
                        data={events}
                        defaultSortBy='history_when'
                        // Rows aren't links — the audit log is the whole record.
                        handleOnClick={() => undefined}
                        isPending={isPending}
                        pendingMessage={t('election_history.loading')}
                        emptyContent={t('election_history.empty')}
                    />
                )}
            </Box>
        </Box>
    );
};

export default ElectionHistoryView;
