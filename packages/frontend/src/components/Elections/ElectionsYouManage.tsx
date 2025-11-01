import { useEffect, useMemo } from 'react'
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election"
import useAuthSession from '../AuthSessionContextProvider';
import { useClaimElection, useGetElections } from '../../hooks/useAPI';
import { useNavigate } from 'react-router';
import EnhancedTable from '../EnhancedTable';
import useSnackbar from '../SnackbarContext';
import { useSessionStorage } from '~/hooks/useSessionStorage';
import { useCookie } from '~/hooks/useCookie';

const ElectionsYouManage = () => {
    const navigate = useNavigate();
    const authSession = useAuthSession()
    const { setSnack } = useSnackbar()

    const { data, isPending, makeRequest: fetchElections } = useGetElections()

    // Note: We handle the claim flow here since it's the first page after login
    const [electionToClaim, setElectionToClaim] = useSessionStorage('election_to_claim', '');
    const [claimKey, setClaimKey] = useCookie(`${electionToClaim}_claim_key`, '');
    const {makeRequest: claim} = useClaimElection(electionToClaim);

    // Claim and fetch are in the same useEffect so that we can guarantee the correct sequence
    useEffect(() => {
        if(!authSession.isLoggedIn()) return;
        if(electionToClaim){
            claim({claim_key: claimKey}).then(res => {
                // @ts-ignore
                if(res.success){
                    setSnack({
                        message: `Election has been claimed to your account`,
                        severity: 'success',
                        open: true,
                        autoHideDuration: 6000,
                    })
                    setClaimKey(null);
                }
            }).finally(() => setElectionToClaim(''))
            return;
        }
        fetchElections();
    },[authSession.isLoggedIn(), electionToClaim])

    const userEmail = authSession.getIdField('email')
    const id = authSession.getIdField('sub')
    const getRoles = (election: Election) => {
        const roles = []
        if (election.owner_id === id) {
            roles.push('Owner')
        }
        if (election.admin_ids?.includes(userEmail)) {
            roles.push('Admin')
        }
        if (election.audit_ids?.includes(userEmail)) {
            roles.push('Auditor')
        }
        if (election.credential_ids?.includes(userEmail)) {
            roles.push('Credentialer')
        }
        return roles.join(', ')
    }

    const managedElectionsData = useMemo(() => {
        if(data?.elections_as_official){
            return data.elections_as_official.map(election => ({
               ...election,
               roles: getRoles(election)
            }));
        }else{
            return [];
        }
    }, [data]);
            
    return <EnhancedTable
        title='My Elections & Polls'
        headKeys={['title', 'update_date', 'election_state', 'start_time', 'end_time', 'description']}
        isPending={isPending || !authSession.isLoggedIn() || electionToClaim}
        pendingMessage='Loading Elections...'
        data={managedElectionsData}
        handleOnClick={(row) => navigate(`/${String(row.raw.election_id)}`)}
        defaultSortBy='update_date'
        emptyContent={<>You don&apos;t have any elections yet<button>Create Election</button></>}
    />
}

export default ElectionsYouManage