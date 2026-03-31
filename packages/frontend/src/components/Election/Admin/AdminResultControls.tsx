import useElection from "~/components/ElectionContextProvider";
import ElectionStateWarning from "../ElectionStateWarning"
import { Box, Switch, Typography } from "@mui/material";
import BarChartIcon from '@mui/icons-material/BarChart';
import { useSetPublicResults } from "../../../hooks/useAPI";

export default () => {
    const { election, refreshElection, permissions } = useElection();
    const { makeRequest } = useSetPublicResults(election.election_id);

    const hasPermission = (p: string) => permissions?.includes(p);

    const showToggle = !['draft', 'finalized'].includes(election.state) &&
        !(election.state === 'open' && election.settings.ballot_updates);

    const togglePublicResults = async () => {
        await makeRequest({ public_results: !election.settings.public_results });
        await refreshElection();
    };

    if(election.state === 'draft') return <></>

    return <ElectionStateWarning title='results.admin_title' description='' hideIcon>
        {showToggle && (
            <Box display='flex' flexDirection='row' alignItems='center' justifyContent='space-between' sx={{ py: 0.5 }}>
                <Box display='flex' flexDirection='row' alignItems='center' gap={1}>
                    <BarChartIcon fontSize='small' color='action' />
                    <Typography component='span'>
                        Results are public
                    </Typography>
                </Box>
                <Switch
                    checked={election.settings.public_results === true}
                    onChange={togglePublicResults}
                    disabled={!hasPermission('canEditElectionState')}
                />
            </Box>
        )}
    </ElectionStateWarning>
}
