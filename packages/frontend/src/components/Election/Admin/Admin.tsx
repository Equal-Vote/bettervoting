import Container from '@mui/material/Container';
import ViewElectionRolls from "./ViewElectionRolls";
import { Routes, Route, useParams, useSearchParams } from 'react-router-dom'
import EditRoles from './EditRoles';
import AdminHome from './AdminHome';
import WriteInApproval from './WriteInApproval';
import { Box, Typography } from '@mui/material';
import Races from '~/components/ElectionForm/Races/Races';
import useElection from '~/components/ElectionContextProvider';
import TemporaryAccessWarning from '../TemporaryAccessWarning';
import ElectionSettings from './ElectionSettings';
import PublishAndShare from './PublishAndShare';
import CheckoutReturn, { isCheckoutReturn } from './Payments/CheckoutReturn';

const AdminPage = ({title, children}: {title: string, children: React.ReactNode}) => {
    const {election} = useElection();
    return <Box sx={{ width: '100%', maxWidth: 800, margin: 'auto', display: "flex", justifyContent: "flex-start", alignItems: "flex-start", flexDirection: "column", gap: 4 }}>
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
    // Stripe Checkout returns to /:id/admin with ?checkout_session_id=… (or ?checkout=cancelled)
    const [searchParams] = useSearchParams();
    return (
        <Container>
            <Routes>
                <Route path='/' element={isCheckoutReturn(searchParams)
                    ? <CheckoutReturn />
                    : <AdminPage title='Admin Home'><AdminHome key={id}/></AdminPage>
                }/>
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
