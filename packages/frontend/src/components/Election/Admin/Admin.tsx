import Container from '@mui/material/Container';
import ViewElectionRolls from "./ViewElectionRolls";
import { Routes, Route, useParams } from 'react-router-dom'
import EditRoles from './EditRoles';
import AdminHome from './AdminHome';
import WriteInApproval from './WriteInApproval';
import { Box, Typography } from '@mui/material';
import Races from '~/components/ElectionForm/Races/Races';
import useElection from '~/components/ElectionContextProvider';
import useDelayedTrue from '~/hooks/useDelayedTrue';
import TemporaryAccessWarning from '../TemporaryAccessWarning';
import ElectionSettings from './ElectionSettings';
import PublishAndShare from './PublishAndShare';

const AdminPage = ({title, children}) => {
    const {election, isSaving} = useElection();
    // Disable interaction immediately when a save starts (correctness), but only show the gray
    // overlay if the round-trip exceeds 500ms — fast saves shouldn't flash a UI dim.
    const showSavingOverlay = useDelayedTrue(isSaving, 500);
    return <Box
        display='flex'
        justifyContent="flex-start"
        alignItems="flex-start"
        flexDirection='column'
        gap={4}
        sx={{ width: '100%', maxWidth: 800, margin: 'auto' }}
    >
        <Box sx={{ml: 0, mr: 'auto'}}>
            <Typography variant="h5">{`${election.title}`}</Typography>
            <Typography variant="h3">{`${title}`}</Typography>
            <TemporaryAccessWarning />
        </Box>
        <Box
            sx={{
                width: '100%',
                opacity: showSavingOverlay ? 0.55 : 1,
                pointerEvents: isSaving ? 'none' : 'auto',
                transition: 'opacity 150ms',
            }}
            aria-busy={isSaving}
        >
            {children}
        </Box>
    </Box>
}

const Admin = () => {
    const { id } = useParams();
    const {election} = useElection();
    return (
        <Container>
            <Routes>
                <Route path='/' element={<AdminPage title='Admin Home'><AdminHome key={id}/></AdminPage>}/>
                <Route path='/build_ballot' element={<AdminPage title='Build Ballot'><Races/></AdminPage>}/>
                <Route path='/voters' element={<AdminPage title='Manage Voters'><ViewElectionRolls /></AdminPage>} />
                <Route path='/roles' element={<EditRoles />} />
                <Route path='/writeins/:raceId' element={<WriteInApproval />} />
                <Route path='/settings' element={<AdminPage title='Settings'><ElectionSettings/></AdminPage>} />
                <Route path='/publish' element={<AdminPage title='Publish & Share'><PublishAndShare/></AdminPage>} />
            </Routes>
        </Container>
    )
}

export default Admin
