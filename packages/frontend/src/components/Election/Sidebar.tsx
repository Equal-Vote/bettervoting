import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Button, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { Paper } from '@mui/material';
import PermissionHandler from '../PermissionHandler';
import useElection from '../ElectionContextProvider';
import useFeatureFlags from '../FeatureFlagContextProvider';
import HomeIcon from '@mui/icons-material/Home';
import BallotIcon from '@mui/icons-material/Ballot';
import PreviewIcon from '@mui/icons-material/Preview';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import SendIcon from '@mui/icons-material/Send';
import BarChartIcon from '@mui/icons-material/BarChart';

const ListItem = ({ text, link, icon }: { text:string, link: string, icon: any}) => {
    return (
        <Button component={Link} to={link} fullWidth sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, pl: {xs: 0, md: 2} }}>
            {icon}
            {/*<Typography gutterBottom variant="h6" component="h6" sx={{ml: 1}}>*/}
            <Typography gutterBottom component="p" sx={{ml: 1}}>
                {text}
            </Typography>
        </Button>
    )
}

export default function Sidebar() {
    
    const { election, voterAuth, permissions } = useElection()
    const id = election.election_id;
    const flags = useFeatureFlags();
    return (
        <>
            {voterAuth?.roles?.length > 0 &&
                <Box
                    display='flex'
                    flexDirection='column'
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                        "@media print": {
                            display: 'none',
                        }
                    }}>
                    <Paper elevation={3}>
                        <ListItem text='Admin Home' link={`/${id}/admin`} icon={<HomeIcon/>}/>
                        <ListItem text='Build Ballot' link={`/${id}/admin/build_ballot`} icon={<BallotIcon/>}/>
                        {election.state === 'draft' &&
                            <>
                                {flags.isSet('ELECTION_ROLES') &&
                                    <PermissionHandler permissions={permissions} requiredPermission={'canEditElectionRoles'}>
                                        <ListItem text='Edit Election Roles' link={`/${id}/admin/roles`} icon={<HomeIcon/>}/>
                                    </PermissionHandler>
                                }
                            </>}
                        <ListItem text='Manage Voters' link={`/${id}/admin/voters`} icon={<PeopleAltIcon/>}/>
                        <ListItem text='Settings' link={`/${id}/admin/settings`} icon={<SettingsIcon/>}/>
                        <ListItem text={election.state == 'draft' ? 'Preview Ballot' : 'Live Ballot'} link={`/${id}/`} icon={<PreviewIcon/>}/>
                        <ListItem text={election.state == 'draft' ? 'Preview Results' : 'Live Results'} link={`/${id}/results`} icon={<BarChartIcon/>}/>
                        <ListItem text='Publish & Share' link={`/${id}/admin/publish`} icon={<SendIcon/>}/>
                    </Paper>
                </Box>
            }
        </>
    );
}
