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
                            <ListItem text='Voting Page' link={`/${id}/`} />
                            <ListItem text='Admin Home' link={`/${id}/admin`} />
                            {election.state === 'draft' &&
                                <>
                                    {flags.isSet('ELECTION_ROLES') &&
                                        <PermissionHandler permissions={permissions} requiredPermission={'canEditElectionRoles'}>
                                            <ListItem text='Edit Election Roles' link={`/${id}/admin/roles`} />
                                        </PermissionHandler>
                                    }
                                </>}
                            {election.settings.voter_access != 'open' && <PermissionHandler permissions={permissions} requiredPermission={'canViewElectionRoll'}>
                                <ListItem text='Voters' link={`/${id}/admin/voters`} />
                            </PermissionHandler>}
                            {/*
                            The "Ballots" choice on the left-hand menu is available only if
                            public_results is true or the election is closed
                            */}
                            {
                                (
                                    election.settings.public_results ||
                                    election.state === 'closed'
                                ) && (
                                    <PermissionHandler permissions={permissions} requiredPermission="canViewBallots">
                                        <ListItem text="Ballots" link={`/${id}/admin/ballots`} />
                                    </PermissionHandler>
                                )}

                        </Grid>
                    </Paper>
                </Box>
            }
        </>
    );
}
