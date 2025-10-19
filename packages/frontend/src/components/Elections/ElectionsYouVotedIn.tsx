import React, { useEffect } from 'react'
import { useGetElections } from "../../hooks/useAPI";
import EnhancedTable from '../EnhancedTable';
import { useNavigate } from 'react-router';

const ElectionsYouVotedIn = () => {
    const navigate = useNavigate();

    const { data, isPending, makeRequest: fetchElections } = useGetElections();

    useEffect(() => {fetchElections()}, []);

    const electionInvitations = React.useMemo(
        () => data?.elections_as_submitted_voter ? data.elections_as_submitted_voter : [],
        [data],
    );
            
    return <EnhancedTable
        title='Elections You Voted In'
        headKeys={['title', 'update_date', 'election_state', 'start_time', 'end_time', 'description']}
        handleOnClick={(election) => {
            console.log(election)
            return navigate(`/${String(election.raw.election_id)}`)
        }}
        isPending={isPending}
        pendingMessage='Loading Elections...'
        data={electionInvitations}
        defaultSortBy='update_date'
        emptyContent="You haven't voted in any elections"
    />
}

export default ElectionsYouVotedIn;