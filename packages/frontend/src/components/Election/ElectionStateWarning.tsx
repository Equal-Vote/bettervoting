import { Box, Divider, Paper, Typography } from "@mui/material";
import useElection from "../ElectionContextProvider";
import type { ElectionState } from "@equal-vote/star-vote-shared/domain_model/Election"
import { ReportProblemOutlined } from "@mui/icons-material";

export default function ElectionStateWarning 
        ({state, title, description, hideIcon=false, children}: {state?: ElectionState, title: string, description: string, hideIcon?: boolean, children?: any}) {
    
    const { t, election } = useElection();
    
    if(state && election.state !== state) return <></>

    return <Paper sx={{display: 'flex', flexDirection: 'column', maxWidth: 600, gap: 2, padding: 2, m: 'auto', mb:4, width: '100%'}}>
        <Box display='flex' flexDirection='row' gap={2} sx={{p: 2, m: 'auto', width: '100%'}}>
            {!hideIcon && <ReportProblemOutlined />}
            <Box sx={{width: '100%'}}>
                <Typography component="p"><b>{t(title)}</b></Typography>
                <hr/> {/* I think the basic styling looks a bit better than mui's <Divider/>*/}
                {description && <Typography component="p">{t(description)}</Typography>}
                {children}
            </Box>
        </Box>
    </Paper>
}
