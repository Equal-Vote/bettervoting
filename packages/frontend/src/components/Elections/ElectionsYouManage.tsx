import { useEffect, useMemo } from 'react'
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election"
import useAuthSession from '../AuthSessionContextProvider';
import { archiveElections, BulkArchiveTarget, useClaimElection, useGetElections } from '../../hooks/useAPI';
import { useNavigate } from 'react-router';
import EnhancedTable, { BulkAction } from '../EnhancedTable';
import { PrimaryButton } from '../styles';
import useSnackbar from '../SnackbarContext';
import useConfirm from '../ConfirmationDialogProvider';
import { useSubstitutedTranslation } from '../util';
import { useSessionStorage } from '~/hooks/useSessionStorage';
import { useCookie } from '~/hooks/useCookie';
import ArchiveIcon from '@mui/icons-material/Archive';

const ElectionsYouManage = () => {
    const navigate = useNavigate();
    const authSession = useAuthSession()
    const { setSnack } = useSnackbar()
    const confirm = useConfirm()
    const { t } = useSubstitutedTranslation()

    const { data, isPending, makeRequest: fetchElections } = useGetElections()

    // Note: We handle the claim flow here since it's the first page after login
    const [electionToClaim, setElectionToClaim] = useSessionStorage('election_to_claim', '');
    const [claimKey, setClaimKey] = useCookie(`${electionToClaim}_claim_key`, '');
    const {makeRequest: claim} = useClaimElection(electionToClaim);

    // Claim and fetch are in the same useEffect so that we can guarantee the correct sequence
    useEffect(() => {
        if(!authSession.isLoggedIn()) return;
        if(electionToClaim && !claimKey){
            setElectionToClaim('');
        }
        if(electionToClaim && claimKey){
            claim({claim_key: claimKey}).then(res => {
                if(res !== false){
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
            
    // Only the owner can change an election's state (permissions.canEditElectionState),
    // and this table also lists elections where you're merely an admin or auditor —
    // so anything you don't own is reported as skipped rather than sent and 401'd.
    const bulkArchive = async (rows: {raw: Election}[]) => {
        const targets: BulkArchiveTarget[] = rows
            .filter(row => row.raw.owner_id === id && row.raw.state !== 'archived')
            .map(row => ({
                election_id: String(row.raw.election_id),
                title: row.raw.title,
                update_date: String(row.raw.update_date),
            }))
        const ineligible = rows.length - targets.length

        if (targets.length === 0) {
            setSnack({
                message: t('bulk_actions.archive.none_eligible'),
                severity: 'warning',
                open: true,
                autoHideDuration: 6000,
            })
            return
        }

        const confirmed = await confirm({
            title: t('bulk_actions.archive.confirm_title'),
            message: t('bulk_actions.archive.confirm_message', { count: targets.length, ineligible }),
            submit: t('bulk_actions.archive.confirm_submit', { count: targets.length }),
        })
        if (!confirmed) return

        const outcome = await archiveElections(targets)
        const parts = [t('bulk_actions.archive.done', { count: outcome.archived.length })]
        if (ineligible > 0) parts.push(t('bulk_actions.archive.skipped', { count: ineligible }))
        if (outcome.failed.length > 0) parts.push(t('bulk_actions.archive.failed', {
            count: outcome.failed.length,
            first_title: outcome.failed[0].target.title,
            first_error: outcome.failed[0].message,
        }))

        setSnack({
            message: parts.join(' '),
            severity: outcome.failed.length > 0 ? 'warning' : 'success',
            open: true,
            autoHideDuration: outcome.failed.length > 0 ? null : 6000,
        })
        fetchElections()
    }

    const bulkActions: BulkAction[] = [{
        key: 'archive',
        label: t('bulk_actions.archive.menu_item'),
        icon: <ArchiveIcon fontSize='small'/>,
        onAction: bulkArchive,
    }]

    return <EnhancedTable
        title='My Elections & Polls'
        headKeys={['title', 'update_date', 'election_state', 'start_time', 'end_time', 'description']}
        isPending={isPending || !authSession.isLoggedIn() || electionToClaim}
        pendingMessage='Loading Elections...'
        data={managedElectionsData}
        handleOnClick={(row) => navigate(`/${String(row.raw.election_id)}`)}
        defaultSortBy='update_date'
        emptyContent={<>You don&apos;t have any elections yet<br/><PrimaryButton onClick={() => navigate('/new_election')}>Create Election</PrimaryButton></>}
        bulkActions={bulkActions}
        getRowId={(row) => String(row.raw.election_id)}
    />
}

export default ElectionsYouManage
