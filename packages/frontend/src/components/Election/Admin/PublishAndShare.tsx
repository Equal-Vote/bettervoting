import { useState } from 'react';
import { DateTime } from 'luxon';
import Grid from "@mui/material/Grid";
import { Box, Divider, FormControl, FormHelperText, Input, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { Typography } from "@mui/material";
import { LinkButton, PrimaryButton, SecondaryButton } from "../../styles";
import { Link, useNavigate } from 'react-router-dom';
import ShareButton from "../ShareButton";
import { useArchiveEleciton, useFinalizeElection, useSetOpenState } from "../../../hooks/useAPI";
import { isValidDate, SwitchSetting, TransitionBox, useSubstitutedTranslation } from '../../util';
import { dateToLocalLuxonDate, useEditElectionDetails } from '../../ElectionForm/Details/useEditElectionDetails';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';
import useAuthSession from '../../AuthSessionContextProvider';
import { AdminPageNavigation } from '../Sidebar';
import { TimeZone, timeZones } from '@equal-vote/star-vote-shared/domain_model/Util';
import useSyncedState from '~/hooks/useSyncedState';

type SectionProps = {
    text: {[key: string]: string}
    button: JSX.Element
    permission?: string
    includeDivider?: boolean
}

export default () => {
    const authSession = useAuthSession()
    const { t, election, refreshElection: fetchElection, permissions } = useElection()
    
    const { makeRequest: finalize } = useFinalizeElection(election.election_id)

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
            await finalize();
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

    const [isOpen, setIsOpen] = useSyncedState(election.state === 'open', async (toggled) => !!await setOpenState({open: toggled}));
    
    const hasScheduledTimes = !!(election.start_time || election.end_time);
    const canEditState = permissions?.includes('canEditElectionState') ?? false;

    return <>
        {(election.state === 'finalized' || election.state === 'open' || election.state === 'closed') && (
            <Box sx={{ m: 0, my: 0, p: 1 }}>
                <SwitchSetting
                    label={t('admin_home.election_is_open')}
                    toggled={isOpen}
                    onToggle={setIsOpen}
                    disabled={hasScheduledTimes || !canEditState}
                    disabledMessage={hasScheduledTimes ? "Open/close is managed automatically based on start and end time" : undefined}
                />
                {election.state === 'closed' && election.end_time && (
                    <Typography variant="body2">{t('admin_home.header_ended_time', {datetime: election.end_time})}</Typography>
                )}
                {election.state === 'open' && election.end_time && (
                    <Typography variant="body2">{t('admin_home.header_end_time', {datetime: election.end_time})}</Typography>
                )}
                {election.state === 'finalized' && election.start_time && (
                    <Typography variant="body2">{t('admin_home.header_start_time', {datetime: election.start_time})}</Typography>
                )}
            </Box>
        )}

        {(election.state !== 'draft' && election.state !== 'finalized') && 
            <Box sx={{width: '100%', maxWidth: 300}}>
                <ShareButton url={`${window.location.origin}/${election.election_id}`} />
            </Box>
        }
        {election.state === 'draft' && <FinalizeSection /> }
        <AdminPageNavigation />
    </>
}