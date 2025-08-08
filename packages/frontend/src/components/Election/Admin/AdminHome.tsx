import Grid from "@mui/material/Grid";
import { Box, Divider } from "@mui/material";
import { Typography } from "@mui/material";
import { PrimaryButton } from "../../styles";
import { Link, useNavigate } from 'react-router-dom';
import ShareButton from "../ShareButton";
import { useArchiveEleciton, useSetOpenState, useFinalizeElection, usePostElection, useSetPublicResults } from "../../../hooks/useAPI";
import { useSubstitutedTranslation } from '../../util';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';
import ElectionDetailsInlineForm from '../../ElectionForm/Details/ElectionDetailsInlineForm';
import Races from '../../ElectionForm/Races/Races';
import ElectionSettings from '../../ElectionForm/ElectionSettings';
import structuredClone from '@ungap/structured-clone';
import useAuthSession from '../../AuthSessionContextProvider';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import ElectionAuthForm from '~/components/ElectionForm/Details/ElectionAuthForm';
import useSnackbar from "~/components/SnackbarContext";

type SectionProps = {
    text: {[key: string]: string}
    button: JSX.Element
    permission?: string
    includeDivider?: boolean
}

const AdminHome = () => {
    const authSession = useAuthSession()
    const { election, refreshElection: fetchElection, permissions } = useElection()
    const {t} = useSubstitutedTranslation(election.settings.term_type, {time_zone: election.settings.time_zone});
    const { makeRequest } = useSetPublicResults(election.election_id)
    const { setSnack } = useSnackbar()
    const togglePublicResults = async () => {
        const public_results = !election.settings.public_results
        await makeRequest({ public_results: public_results })
        await fetchElection()
    }
    const { makeRequest: finalize } = useFinalizeElection(election.election_id)
    const { makeRequest: archive } = useArchiveEleciton(election.election_id)
    const { makeRequest: setOpenState } = useSetOpenState(election.election_id)

    const navigate = useNavigate()
    const { makeRequest: postElection } = usePostElection()
    
    const confirm = useConfirm()
    const emailConfirm = useConfirm()

    const hasPermission = (requiredPermission: string) => {
        return (permissions && permissions.includes(requiredPermission))
    }

    const finalizeElection = async () => {
        const confirmed = await confirm(t('admin_home.finalize_confirm'))
        if (!confirmed) return
        try {
            await finalize()
            await fetchElection()
        } catch (err) {
            console.error(err)
        }

        setSnack({
            message: t('admin_home.finalize_snack'),
            severity: 'success',
            open: true,
            autoHideDuration: 6000,
        })
        
        const currentTime = new Date();
        if (
            election.settings.voter_access === 'closed' &&
            election.settings.invitation === 'email' &&
            (!election.start_time || currentTime.getTime() > new Date(election.start_time).getTime()) &&
            (!election.end_time || currentTime.getTime() < new Date(election.end_time).getTime())
        ){
            if(await emailConfirm(t('admin_home.finalize_email_confirm'))){
                navigate(`/${election.election_id}/admin/voters`)
            }
        }
    }

    const archiveElection = async () => {
        const confirmed = await confirm(t('admin_home.finalize_confirm'))
        if (!confirmed) return
        try {
            await archive()
            await fetchElection()
        } catch (err) {
            console.error(err)
        }
    }

    const duplicateElection = async () => {
        const confirmed = await confirm(t('admin_home.duplicate_confirm'))
        if (!confirmed) return
        const copiedElection = structuredClone(election)
        copiedElection.title = t('admin_home.copied_title', {title: copiedElection.title})
        copiedElection.frontend_url = ''
        copiedElection.owner_id = authSession.getIdField('sub')
        copiedElection.state = 'draft'

        const newElection = await postElection(
            {
                Election: copiedElection,
            })

        if ((!newElection)) {
            throw Error("Error submitting election");
        }
        navigate(`/${newElection.election.election_id}/admin`)
    }

    const closeElection = async () => {
        try {
            await setOpenState({closing: true})
            await fetchElection()
        } catch (err) {
            console.error(err)
        }

        setSnack({
            message: t('admin_home.close_snack'),
            severity: 'success',
            open: true,
            autoHideDuration: 6000,
        })
    }

    const openElection = async () => {
        try {
            await setOpenState({closing: false})
            await fetchElection()
        } catch (err) {
            console.error(err)
        }

        setSnack({
            message: t('admin_home.open_snack'),
            severity: 'success',
            open: true,
            autoHideDuration: 6000,
        })
    }

    const Section = ({ text, button, permission, includeDivider=true }: SectionProps) => 
        <Grid container sx={{ maxWidth: 800}}>
            <Grid xs={12} md={8} sx={{ p: 1 }}>
                <Box sx={{ minHeight: { xs: 0, md: 60 } }}>
                    <Typography variant="h5">
                        {text.description}
                    </Typography>
                    {text.subtext && 
                        <Typography variant="body1" sx={{ pl: 2 }}>
                            {text.subtext}
                        </Typography>
                    }
                    {permission && !hasPermission(permission) &&
                        <Typography align='center' variant="body1" sx={{ color: 'error.main', pl: 2 }}>
                            {t('admin_home.permissions_error')}
                        </Typography>
                    }
                </Box>
            </Grid>
            <Grid xs={12} md={4} sx={{ p: 1, pl: 2, display: 'flex', alignItems: 'center' }}>
                {button}
            </Grid>
            {includeDivider && <Divider style={{width: '100%'}}/>}
        </Grid>

    const EditRolesSection = () => <Section
        text={t('admin_home.roles')}
        permission='canEditElectionRoles'
        button={(<>
            <PrimaryButton
                disabled={!hasPermission('canEditElectionRoles')}
                fullWidth
                component={Link} to={`/${election.election_id}/admin/roles`}
            >
                {t('admin_home.roles.button')}
            </PrimaryButton>
        </>)}
    />

    const TestBallotSection = () => <Section
        text={t('admin_home.test_ballot')}
        permission='canViewElectionRoll'
        button={(<>
            <PrimaryButton
                type='button'
                role='button'
                fullWidth
                component={Link} to={`/${election.election_id}`}
            >
                {t('admin_home.test_ballot.button')}
            </PrimaryButton>
        </>)}
    />

    const DuplicateElectionSection = () => <Section
        text={t('admin_home.duplicate')}
        button={
            <PrimaryButton
                disabled={!hasPermission('canEditElectionState')}
                fullWidth
                onClick={() => duplicateElection()}
            >
                {t('admin_home.duplicate.button')}
            </PrimaryButton>
        }
    />

    // const ResultsSection = () => <Section
    //     text={t('admin_home.view_results')}
    //     permission='canViewPreliminaryResults'
    //     button={(<>
            
    //     </>)}
    // />

    const TogglePublicResultsSection = () => {
        const m = t('admin_home.public_results');
        const text = {
            ...m,
            description: election.settings.public_results === true ? m.make_private : m.make_public
        };
        return <Section
            text={text}
            permission='canEditElectionState'
            button={(<>
                <PrimaryButton
                    disabled={!hasPermission('canEditElectionState')}
                    fullWidth
                    onClick={togglePublicResults}
                >
                    {text.description}
                </PrimaryButton>
            </>)}
        />
    }

    const ArchiveElectionSection = () => <Section
        text={t('admin_home.archive')}
        includeDivider={false}
        permission='canEditElectionState'
        button={(<>
            <PrimaryButton
                disabled={!hasPermission('canEditElectionState')}
                fullWidth
                onClick={() => archiveElection()}
            >
                {t('admin_home.archive.button')}
            </PrimaryButton>
        </>)}
    />

    const CloseElectionSection = () => <Section
        text={t('admin_home.close')}
        button={(<>
            <PrimaryButton
                disabled={!hasPermission('canEditElectionState')}
                fullWidth
                onClick={() => closeElection()}
            >
                {t('admin_home.close.button')}
            </PrimaryButton>
        </>)}
    />

    const OpenElectionSection = () => <Section
        text={t('admin_home.open')}
        button={(<>
            <PrimaryButton
                disabled={!hasPermission('canEditElectionState')}
                fullWidth
                onClick={() => openElection()}
            >
                {t('admin_home.open.button')}
            </PrimaryButton>
        </>)}
    />

    const HeaderSection = () => {
        return <Box width='100%'>

            {
            /* Sometimes the email blast will bug, and then this message will make the UX of the bug worse */
            /*{(election.state === 'open' || election.state == 'finalized') && election.settings.invitation &&
                <Typography align='center' gutterBottom variant="h6" component="h6" >
                    {t('admin_home.header_invitations_sent')}
                </Typography>
            }*/}

            {election.state === 'finalized' && election.start_time &&
                <Typography align='center' gutterBottom variant="h6" component="h6" >
                    {t('admin_home.header_start_time', {datetime: election.start_time})}
                </Typography>
            }
            {election.state === 'open' && election.end_time &&
                <Typography align='center' gutterBottom variant="h6" component="h6">
                    {t('admin_home.header_end_time', {datetime: election.end_time})}
                </Typography>
            }
            {election.state === 'closed' && election.end_time && 
                <Typography align='center' gutterBottom variant="h6" component="h6">
                    {t('admin_home.header_ended_time', {datetime: election.end_time})}
                </Typography>
            }
            {election.state === 'archived' && election.end_time &&
                <Typography align='center' gutterBottom variant="h6" component="h6">
                    {t('admin_home.header_ended_time', {datetime: election.end_time})}
                </Typography>
            }
        </Box>
    }

    const FinalizeSection = () => <Box sx={{maxWidth: 800}}>
        <Grid xs={12} sx={{ p: 1, pt: 3, pb: 0 }}>
            <Typography align='center' variant="body1" sx={{ pl: 2 }}>
                {t('admin_home.finalize_description')}
                {' '}
                {t(election.start_time? 'admin_home.finalize_voting_begins_later' : 'admin_home.finalize_voting_begins_now')}
            </Typography>
            {/* I don't think this is true anymore */}
            {/* {election.settings.invitation &&
                <Typography align='center' variant="body1" sx={{ pl: 2 }}>
                   {t('admin_home.finalize_invitations_will_send')}
                </Typography>
            } */}
            {!hasPermission('canEditElectionState') &&
                <Typography align='center' variant="body1" sx={{ color: 'error.main', pl: 2 }}>
                    {t('admin_home.permissions_error')}
                </Typography>
            }
        </Grid>
        <Grid xs={12} sx={{ p: 1, pt: 0, display: 'flex', alignItems: 'center' }}>
            <PrimaryButton
                disabled={election.title.length === 0 || election.races.length === 0 || !hasPermission('canEditElectionState')}
                fullWidth
                onClick={() => finalizeElection()}
                sx={{mt: 2}}
            >
                <Typography align='center' variant="h4" fontWeight={'bold'}>
                   {t('admin_home.finalize_button')}
                </Typography>
            </PrimaryButton>
        </Grid>
    </Box>
    
    const flags = useFeatureFlags();

    return <Box
        display='flex'
        justifyContent="center"
        alignItems="center"
        flexDirection='column'
        gap={6}
        sx={{ width: '100%', maxWidth: 800, margin: 'auto' }}
    >
        <HeaderSection />
        <ElectionDetailsInlineForm />
        {(election.state !== 'draft' && election.state !== 'finalized') && 
            <Box display='flex' sx={{flexDirection:{xs: 'column', sm: 'row'}}} alignItems='center' gap={2} justifyContent='space-evenly' width='100%'>
                <Box sx={{width: '100%', maxWidth: 300}}>
                    <ShareButton url={`${window.location.origin}/${election.election_id}`} />
                </Box>
                <Box sx={{width: '100%', maxWidth: 300}}>
                    <PrimaryButton
                        disabled={!(hasPermission('canViewPreliminaryResults') || election.settings.public_results === true)}
                        fullWidth
                        component={Link} to={`/${election.election_id}/results`}
                    >
                        {t('admin_home.view_results.button')}
                    </PrimaryButton>
                </Box>
            </Box>
        }
        {(election.settings.voter_access === 'open') && <ElectionAuthForm />}
        <ElectionSettings />
        <Races />
        <Box sx={{width: '100%'}}>
            {(election.state === 'draft') && <TestBallotSection /> }
            {(election.state !== 'draft' && election.state !== 'finalized') && <TogglePublicResultsSection/>}
            {flags.isSet('ELECTION_ROLES') && <EditRolesSection />}
            <DuplicateElectionSection/>
            {(election.state === 'open') && !election.start_time && <CloseElectionSection />}
            {(election.state === 'closed') && !election.start_time && <OpenElectionSection />}
            <ArchiveElectionSection />
        </Box>

        {election.state === 'draft' && <FinalizeSection /> }
    </Box>
}

export default AdminHome
