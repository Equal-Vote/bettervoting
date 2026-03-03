import React, { useEffect } from 'react'
import { useGetElections } from "../../hooks/useAPI";
import EnhancedTable from '../EnhancedTable';
import { useNavigate } from 'react-router';

const electionInvitations = () => {
    const navigate = useNavigate();

    const { data, isPending, makeRequest: fetchElections } = useGetElections();

    useEffect(() => {fetchElections()}, []);

    const electionInvitations = React.useMemo(
        () => data?.elections_as_unsubmitted_voter ? data.elections_as_unsubmitted_voter : [],
        [data],
    );
            
    return <EnhancedTable
        title='Election Invitations'
        headKeys={['title', 'election_state', 'start_time', 'end_time', 'description']}
        handleOnClick={(election) => navigate(`/${String(election.election_id)}`)}
        isPending={isPending}
        pendingMessage='Loading Elections...'
        data={electionInvitations}
        defaultSortBy='title'
        emptyContent='No Election Invitations'
    />
}

export default electionInvitations;