import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Button, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { Paper } from '@mui/material';
import PermissionHandler from '../PermissionHandler';
import useElection from '../ElectionContextProvider';
import useFeatureFlags from '../FeatureFlagContextProvider';

const ListItem = ({ text, link }: { text:string, link: string}) => {
    return (
        <Grid item>
            <Button component={Link} to={link} fullWidth >
                <Typography align='center' gutterBottom variant="h6" component="h6">
                    {text}
                </Typography>
            </Button>
        </Grid>
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
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                        "@media print": {
                            display: 'none',
                        }
                    }}>
                    <Paper elevation={3} sx={{ width: 600 }} >
                        <Grid container direction="column">
                            <ListItem text='Admin Home' link={`/${id}/admin`} />
                            <ListItem text='Ballot Builder' link={`/${id}/admin/ballot_builder`} />
                            <ListItem text='Preview Ballot' link={`/${id}/`} />
                            {election.state === 'draft' &&
                                <>
                                    {flags.isSet('ELECTION_ROLES') &&
                                        <PermissionHandler permissions={permissions} requiredPermission={'canEditElectionRoles'}>
                                            <ListItem text='Edit Election Roles' link={`/${id}/admin/roles`} />
                                        </PermissionHandler>
                                    }
                                </>}
                            <PermissionHandler permissions={permissions} requiredPermission={'canViewElectionRoll'}>
                                <ListItem text='Manage Voters' link={`/${id}/admin/voters`} />
                            </PermissionHandler>
                        </Grid>
                    </Paper>
                </Box>
            }
        </>
    );
}
