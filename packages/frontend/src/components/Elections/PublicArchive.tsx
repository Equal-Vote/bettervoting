import { useEffect, useMemo } from 'react'
import { useGetElections } from "../../hooks/useAPI";
import { useNavigate } from 'react-router';
import EnhancedTable from '../EnhancedTable';
import { Container } from '@mui/material';

const PublicArchive = () => {
    const navigate = useNavigate();

    const { data, isPending, makeRequest: fetchElections } = useGetElections();

    useEffect(() => {fetchElections()}, []);

    const publicArchiveData = useMemo(
        () =>  [...data?.public_archive_elections ?? [] ],
        [data]
    );

    return <Container>
        <EnhancedTable
            title='Elections for Public Office'
            headKeys={[ 'title', 'update_date', 'description']}
            data={publicArchiveData}
            isPending={isPending}
            pendingMessage='Loading Elections...'
            handleOnClick={(election) => navigate(`/${String(election.raw.election_id)}/results`)}
            defaultSortBy='update_date'
            emptyContent='No Election Invitations'
        />
    </Container>
}

export default PublicArchive;