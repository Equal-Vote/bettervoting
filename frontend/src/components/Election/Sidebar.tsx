import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Button, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { Paper } from '@mui/material';
import PermissionHandler from '../PermissionHandler';
import useElection from '../ElectionContextProvider';

const ListItem = ({ text, link }) => {
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
    return (
        <>
            {voterAuth?.roles?.length > 0 &&
                <Box
                    display='flex'
                    justifyContent="center"
                    alignItems="center"
                    sx={{ width: '100%' }}>
                    <Paper elevation={3} sx={{ width: 600 }} >
                        <Grid container direction="column" >
                            <ListItem text='Voting Page' link={`/Election/${id}/`} />
                            <ListItem text='Admin Home' link={`/Election/${id}/admin`} />
                            {election.state === 'draft' &&
                                <>
                                    {process.env.REACT_APP_FF_METHOD_ELECTION_ROLES === 'true' &&
                                        <PermissionHandler permissions={permissions} requiredPermission={'canEditElectionRoles'}>
                                            <ListItem text='Edit Election Roles' link={`/Election/${id}/admin/roles`} />
                                        </PermissionHandler>
                                    }
                                </>}
                            {election.settings.voter_access != 'open' && <PermissionHandler permissions={permissions} requiredPermission={'canViewElectionRoll'}>
                                <ListItem text='Voters' link={`/Election/${id}/admin/voters`} />
                            </PermissionHandler>}
                            <PermissionHandler permissions={permissions} requiredPermission={'canViewBallots'}>
                                <ListItem text='Ballots' link={`/Election/${id}/admin/ballots`} />
                            </PermissionHandler>
                        </Grid>
                    </Paper>
                </Box>
            }
        </>
    );
}
