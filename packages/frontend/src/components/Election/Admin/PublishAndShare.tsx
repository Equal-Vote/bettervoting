import Grid from "@mui/material/Grid";
import { Box, Divider } from "@mui/material";
import { Typography } from "@mui/material";
import { PrimaryButton } from "../../styles";
import { Link, useNavigate } from 'react-router-dom';
import ShareButton from "../ShareButton";
import { useArchiveEleciton, useSetOpenState, useFinalizeElection } from "../../../hooks/useAPI";
import { useSubstitutedTranslation } from '../../util';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';
import useAuthSession from '../../AuthSessionContextProvider';
import useSnackbar from "~/components/SnackbarContext";
import { SwitchSetting } from "~/components/util";

type SectionProps = {
    text: {[key: string]: string}
    button: JSX.Element
    permission?: string
    includeDivider?: boolean
}

export default () => {
    const authSession = useAuthSession()
    const { election, refreshElection: fetchElection, permissions } = useElection()
    const {t} = useSubstitutedTranslation(election.settings.term_type, {time_zone: election.settings.time_zone});
    const { setSnack } = useSnackbar()
    const { makeRequest: finalize } = useFinalizeElection(election.election_id)
    const { makeRequest: archive } = useArchiveEleciton(election.election_id)
    const { makeRequest: setOpenState } = useSetOpenState(election.election_id)

    const navigate = useNavigate()
    
    const confirm = useConfirm()
    const emailConfirm = useConfirm()

    const hasPermission = (requiredPermission: string) => {
        return (permissions && permissions.includes(requiredPermission))
    }

    if (!hasPermission('canEditElectionState')) return <Box width='100%'>
        <Typography align='center' variant="h5" sx={{ color: 'error.main', pl: 2 }}>
            {t('admin_home.admin_access_denied')}
        </Typography>
    </Box>

    const finalizeElection = async () => {
        const confirmed = await confirm(t('admin_home.finalize_confirm'));
        if (!confirmed) return;
        try {
            await finalize() && setSnack({
                message: t('admin_home.finalize_snack'),
                severity: 'success',
                open: true,
                autoHideDuration: 6000,
            });
            await fetchElection();
        } catch (err) {
            console.error(err);
        }

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
        const confirmed = await confirm(t('admin_home.archive_confirm'))
        if (!confirmed) return
        try {
            await archive() && setSnack({
                message: t('admin_home.archive_snack'),
                severity: 'success',
                open: true,
                autoHideDuration: 6000,
            });
            await fetchElection()
        } catch (err) {
            console.error(err)
        }
    }

    const changeOpenState = async (open: boolean): Promise<false | void> => {
        try {
            await setOpenState({open}) && setSnack({
                message: t(`admin_home.${open ? 'open': 'close'}_snack`),
                severity: 'success',
                open: true,
                autoHideDuration: 6000,
            });
            await fetchElection();
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    const Section = ({ text, button, permission, includeDivider=true }: SectionProps) => 
        <Grid container sx={{ maxWidth: 800}}>
            <Grid item xs={12} md={8} sx={{ p: 1 }}>
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
            <Grid item xs={12} md={4} sx={{ p: 1, pl: 2, display: 'flex', alignItems: 'center' }}>
                {button}
            </Grid>
            {includeDivider && <Divider style={{width: '100%'}}/>}
        </Grid>

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

    const FinalizeSection = () => <Box sx={{maxWidth: 800}}>
        <Grid item xs={12} sx={{ p: 1, pt: 3, pb: 0 }}>
            <Typography align='center' variant="body1" sx={{ pl: 2 }}>
                {t('admin_home.finalize_description')}
            </Typography>
            {!hasPermission('canEditElectionState') &&
                <Typography align='center' variant="body1" sx={{ color: 'error.main', pl: 2 }}>
                    {t('admin_home.permissions_error')}
                </Typography>
            }
        </Grid>
        <Grid item xs={12} sx={{ p: 1, pt: 0, display: 'flex', alignItems: 'center' }}>
            <PrimaryButton
                disabled={election.title.length === 0 || election.races.length === 0 || !hasPermission('canEditElectionState') || !authSession.isLoggedIn()}
                fullWidth
                onClick={() => finalizeElection()}
                sx={{mt: 2}}
            >
                <Typography align='center' variant="h4" fontWeight={'bold'}>
                   {t('admin_home.finalize_button')}
                </Typography>
            </PrimaryButton>
        </Grid>
        {!authSession.isLoggedIn() && 
        <Grid xs={12} sx={{ p: 1, pt: 0, display: 'flex', alignItems: 'center' }}>
            <Typography align='center' variant="body1" sx={{ pl: 2, m:'auto' }}>
                {/* I'm setting an href here and an onClick, so that the url styling will work like other a-href components*/}
                <a href='#free-account-text' id='free-account-text' onClick={() => {
                    sessionStorage.setItem('election_to_claim', election.election_id)
                    authSession.openLogin()
                }}>
                    Create a free account
                </a>
                &nbsp;to finalize your election!
            </Typography>
        </Grid>}
    </Box>
    
    return <>
        {(election.state === 'open' || election.state === 'closed') && !election.start_time && !election.end_time && (
            <Box sx={{width: '100%', maxWidth: 500, m: 'auto'}}>
                <SwitchSetting
                    label={t(election.state === 'open' ? 'admin_home.election_is_open' : 'admin_home.election_is_closed')}
                    checked={election.state === 'open'}
                    onToggle={changeOpenState}
                    disabled={!hasPermission('canEditElectionState')}
                />
                {/*{election.state != 'archived' && <ArchiveElectionSection />}*/}
            </Box>
        )}

        {(election.state !== 'draft' && election.state !== 'finalized') && 
            <Box display='flex' sx={{flexDirection:{xs: 'column', sm: 'row'}}} alignItems='center' gap={2} justifyContent='space-evenly' width='100%'>
                <Box sx={{width: '100%', maxWidth: 300}}>
                    <ShareButton url={`${window.location.origin}/${election.election_id}`} />
                </Box>
                {(hasPermission('canViewPreliminaryResults') && election.settings.public_results || election.state === 'closed') &&
                    <Box sx={{width: '100%', maxWidth: 300}}>
                        <PrimaryButton
                            fullWidth
                            component={Link} to={`/${election.election_id}/results`}
                        >
                            {t('admin_home.view_results.button')}
                        </PrimaryButton>
                    </Box>
                }
            </Box>
        }
        {election.state === 'draft' && <FinalizeSection /> }
    </>
}