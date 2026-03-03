import Container from '@mui/material/Container';
import ViewElectionRolls from "./ViewElectionRolls";
import { Routes, Route, useParams } from 'react-router-dom'
import EditRoles from './EditRoles';
import ViewBallots from './ViewBallots';
import AdminHome from './AdminHome';
const Admin = () => {
    const { id } = useParams();
    return (
        <Container>
            <Routes>
                <Route path='/' element={<AdminHome key={id} />} />
                <Route path='/voters' element={<ViewElectionRolls />} />
                <Route path='/roles' element={<EditRoles />} />
                <Route path='/ballots' element={<ViewBallots />} />
            </Routes>
        </Container>
    )
}

export default Admin
