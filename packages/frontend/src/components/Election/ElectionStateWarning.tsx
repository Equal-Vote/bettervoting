import { Box, Paper, Typography } from "@mui/material";
import useElection from "../ElectionContextProvider";
import type { ElectionState } from "@equal-vote/star-vote-shared/domain_model/Election"

export default function ElectionStateWarning 
        ({state, title, description}: {state: ElectionState, title: string, description: string}) {
    
    const { t, election } = useElection();
    
    if(election.state !== state) return <></>

    return <Paper sx={{display: 'flex', flexDirection: 'row', maxWidth: 600, gap: 2, padding: 2, m: 'auto', mb:4}}>
        <Typography component="h3">⚠️</Typography>
        <Box>
            <Typography component="p"><b>{t(title)}</b></Typography>
            <hr/>
            <Typography component="p">{t(description)}</Typography>
        </Box>
    </Paper>
}
