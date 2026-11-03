import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import useElection from "../ElectionContextProvider";
import { useGetElectionHistory } from "../../hooks/useAPI";
import EnhancedTable from "../EnhancedTable";
import { electionHasAuditLog } from "@equal-vote/star-vote-shared/domain_model/AuditLog";

const ElectionHistoryView = () => {
    const { election, t } = useElection();
    const { data, isPending, error, makeRequest: getHistory } = useGetElectionHistory(election?.election_id);
    // The backend refuses the log for elections created before the cutoff;
    // don't even ask, so the page explains why instead of showing an error.
    const hasAuditLog = electionHasAuditLog(election);

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

                {!hasAuditLog && (
                    <Typography color="text.secondary">
                        {t('election_history.not_available')}
                    </Typography>
                )}

                {hasAuditLog && error && (
                    <Typography color="text.secondary">
                        {t('election_history.not_finalized')}
                    </Typography>
                )}

                {hasAuditLog && !error && (
                    <EnhancedTable
                        title={t('election_history.title')}
                        headKeys={['history_event', 'history_description', 'history_note', 'history_when']}
                        data={data?.events ?? []}
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
