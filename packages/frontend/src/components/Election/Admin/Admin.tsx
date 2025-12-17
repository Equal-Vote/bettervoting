import Container from '@mui/material/Container';
import ViewElectionRolls from "./ViewElectionRolls";
import { Routes, Route, useParams } from 'react-router-dom'
import EditRoles from './EditRoles';
import AdminHome from './AdminHome';
import WriteInApproval from './WriteInApproval';
import { Box, Typography } from '@mui/material';
import Races from '~/components/ElectionForm/Races/Races';
import useElection from '~/components/ElectionContextProvider';
import TemporaryAccessWarning from '../TemporaryAccessWarning';

const AdminPage = ({title, children}) => {
    const {election} = useElection();
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
        {children}
    </Box>
}

const Admin = () => {
    const { id } = useParams();
    const {election} = useElection();
    return (
        <Container>
            <Routes>
                <Route path='/' element={<AdminPage title='Admin Home'><AdminHome key={id}/></AdminPage>}/>
                <Route path='/ballot_builder' element={<AdminPage title='Ballot Builder'><Races/></AdminPage>}/>
                <Route path='/voters' element={<AdminPage title='Manage Voters'><ViewElectionRolls /></AdminPage>} />
                <Route path='/roles' element={<EditRoles />} />
                <Route path='/writeins/:raceId' element={<WriteInApproval />} />
            </Routes>
        </Container>
    )
}

export default Admin
