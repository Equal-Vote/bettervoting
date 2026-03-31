import useElection from "~/components/ElectionContextProvider";
import ElectionStateWarning from "../ElectionStateWarning"
import { Box, Switch, Typography } from "@mui/material";
import BarChartIcon from '@mui/icons-material/BarChart';
import { useSetPublicResults } from "../../../hooks/useAPI";

export default () => {
    const { election, refreshElection, t } = useElection();
    const { makeRequest } = useSetPublicResults(election.election_id);

    const showToggle = !['draft', 'finalized'].includes(election.state) &&
        !(election.state === 'open' && election.settings.ballot_updates);

    const togglePublicResults = async () => {
        await makeRequest({ public_results: !election.settings.public_results });
        await refreshElection();
    };

    // TODO: add some error scenarios where election is outside draft but can't be toggled
    //  - if updatable ballots is enabled then the toggle should be disabled

    if(election.state === 'draft') return <></>

    return <ElectionStateWarning title='results.admin_title' description='' hideIcon>
        {showToggle && (
            <Box display='flex' flexDirection='row' alignItems='center' justifyContent='space-between' sx={{ py: 0.5 }}>
                <Box display='flex' flexDirection='row' alignItems='center' gap={1}>
                    <Typography component='span'>
                        {t(election.settings.public_results ? 'results.admin_results_public': 'results.admin_results_hidden')}
                    </Typography>
                </Box>
                <Switch
                    checked={election.settings.public_results === true}
                    onChange={togglePublicResults}
                />
            </Box>
        )}
    </ElectionStateWarning>
}
