import { useEffect, useMemo } from 'react'
import { useGetElections } from "../../hooks/useAPI";
import { useNavigate } from 'react-router';
import EnhancedTable from '../EnhancedTable';
import {  Container, Link, Typography } from '@mui/material';

const OpenElections = () => {
    const navigate = useNavigate();

    const { data, isPending, makeRequest: fetchElections } = useGetElections();

    useEffect(() => {fetchElections()}, []);

    const openElectionsData = useMemo(
        () => data?.open_elections ? [...data.open_elections] : [],
        [data]
    );

    return <Container>
        <Typography component='p' sx={{textAlign: 'center'}}>
            For browsing the archive of elections for public office, <Link href="/PublicArchive">checkout the public archive!</Link>
        </Typography>
        <EnhancedTable
            title='Open Online Elections'
            headKeys={[ 'title', 'update_date', 'start_time', 'end_time', 'description']}
            data={openElectionsData}
            isPending={isPending}
            pendingMessage='Loading Elections...'
            handleOnClick={(election) => navigate(`/${String(election.raw.election_id)}`)}
            defaultSortBy='update_date'
            emptyContent='No Election Invitations'
        />
    </Container>
}

export default OpenElections