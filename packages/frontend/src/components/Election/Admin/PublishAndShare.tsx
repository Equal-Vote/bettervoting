import { useState } from 'react';
import useSyncedState from "~/hooks/useSyncedState";
import { DateTime } from 'luxon';
import Grid from "@mui/material/Grid";
import { Box, Divider, FormControl, FormHelperText, Input, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { Typography } from "@mui/material";
import { LinkButton, PrimaryButton, SecondaryButton } from "../../styles";
import { Link, useNavigate } from 'react-router-dom';
import ShareButton from "../ShareButton";
import { useArchiveEleciton, useSetOpenState, useFinalizeElection } from "../../../hooks/useAPI";
import { isValidDate, TransitionBox, useSubstitutedTranslation } from '../../util';
import { dateToLocalLuxonDate, useEditElectionDetails } from '../../ElectionForm/Details/useEditElectionDetails';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';
import useAuthSession from '../../AuthSessionContextProvider';
import { SwitchSetting } from "~/components/util";
import { TimeZone, timeZones } from '@equal-vote/star-vote-shared/domain_model/Util';

type SectionProps = {
    text: {[key: string]: string}
    button: JSX.Element
    permission?: string
    includeDivider?: boolean
}

export default () => {
    const authSession = useAuthSession()
    const { t, election, refreshElection: fetchElection, permissions, updateElection } = useElection()
    /* will be uncommented for https://github.com/Equal-Vote/bettervoting/issues/1304

    const [settingEndTime, setSettingEndTime] = useState(false);
    const [endTimeInput, setEndTimeInput] = useState('');

    const { editedElection, applyUpdate, onSave, errors, setErrors } = useEditElectionDetails()
    const timeZone = election.settings.time_zone ?? DateTime.now().zone.name;
    const [defaultEndTime, setDefaultEndTime] = useState(isValidDate(editedElection.end_time) ? editedElection.end_time : DateTime.now().plus({ days: 1 }).setZone(timeZone).toJSDate())

    const saveEndTime = async () => {
        if (!endTimeInput) return;
        await updateElection(e => { e.end_time = DateTime.fromISO(endTimeInput).setZone(timeZone, { keepLocalTime: true }).toJSDate(); });
        await fetchElection();
        setSettingEndTime(false);
    };

    let {t} = useSubstitutedTranslation(election.settings.term_type, {time_zone: timeZone});*/
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

    const changeOpenState = async (open: boolean): Promise<false | void> => {
        try {
            await setOpenState({open});
            if (!open && election.end_time) {
                await updateElection(e => { e.end_time = undefined; });
            }
            await fetchElection();
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    const [isOpen, setIsOpen] = useSyncedState(
        election.state === 'open',
        async (open) => { const result = await changeOpenState(open); return result !== false; }
    );

    /* will be uncommented for https://github.com/Equal-Vote/bettervoting/issues/1304
    const EndTimeForm = () => <Box display='flex' flexDirection='row' gap={2} sx={{maxWidth: '300'}}>
        <FormControl fullWidth>
            <InputLabel id="time-zone-label">{t('election_details.time_zone')}</InputLabel>
            <Select
                labelId="time-zone-label"
                id="time-zone-select"
                value={timeZone}
                label={t('election_details.time_zone')}
                onChange={(e) => {
                    applyUpdate(election => { election.settings.time_zone = e.target.value as TimeZone })
                    const p = useSubstitutedTranslation(editedElection.settings.term_type, {time_zone: e.target.value});
                    t = p.t;
                }}
            >
                <MenuItem value={DateTime.now().zone.name}>{DateTime.now().zone.name}</MenuItem>
                <Divider />
                {timeZones.map(tz =>
                    <MenuItem key={tz} value={tz}>{t(`time_zones.${tz}`)}</MenuItem>
                )}
            </Select>
        </FormControl>
        <FormControl fullWidth>
            <InputLabel shrink>{t('election_details.end_date')}</InputLabel>
            {/* datetime-local is formatted according to the OS locale, I don't think there's a way to override it*}
            <Input
                type='datetime-local'
                inputProps={{ "aria-label": "End Time" }}
                error={errors.endTime !== ''}
                value={dateToLocalLuxonDate(editedElection.end_time, timeZone)}
                onChange={(e) => {
                    setErrors({ ...errors, endTime: '' })
                    if (e.target.value == null || e.target.value == '') {
                        applyUpdate(election => { election.end_time = undefined})
                    } else {
                        applyUpdate(election => { election.end_time = DateTime.fromISO(e.target.value).setZone(timeZone, { keepLocalTime: true }).toJSDate()})
                        setDefaultEndTime(DateTime.fromISO(e.target.value).setZone(timeZone, { keepLocalTime: true }).toJSDate())
                    }
                }}
            />
            <FormHelperText error={!!errors.endTime} sx={{ pl: 0, mt: 0 }}>
                {errors.endTime || (editedElection.end_time && timeZone !== DateTime.now().zone.name &&
                    `${DateTime.now().zone.name}: ${DateTime.fromJSDate(new Date(editedElection.end_time)).setZone(DateTime.now().zone.name).toLocaleString(DateTime.DATETIME_SHORT)}`
                )}
            </FormHelperText>
        </FormControl>
    </Box>*/

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
        {(election.state === 'open' || election.state === 'closed') && (
            <Box sx={{width: '100%', maxWidth: 500}}>
                <SwitchSetting
                    label={t(isOpen ? 'admin_home.election_is_open' : 'admin_home.election_is_closed')}
                    toggled={isOpen}
                    onToggle={setIsOpen}
                    disabled={!hasPermission('canEditElectionState')}
                />
                
                {election.state === 'closed' && election.end_time && (
                    <Typography variant="body2">{t('admin_home.header_ended_time', {datetime: election.end_time})}</Typography>
                )}
                {election.state === 'open' && election.end_time && !settingEndTime && (
                    <Typography variant="body2">{t('admin_home.header_end_time', {datetime: election.end_time})}</Typography>
                )}
            </Box>
        )}

        {/* Will be uncommented for https://github.com/Equal-Vote/bettervoting/issues/1304
        {election.state == 'draft' &&
            <Box sx={{
                position: 'relative',
                height: settingEndTime ? '120px' : '50px',
                transition: 'height 0.5s',
            }}>
                <TransitionBox absolute enabled={!settingEndTime}>
                    <LinkButton onClick={() => {
                        setEndTimeInput(dateToLocalLuxonDate(DateTime.now().plus({ days: 1 }).setZone(timeZone).toJSDate(), timeZone));
                        setSettingEndTime(true);
                    }}>Set end time</LinkButton>
                </TransitionBox>
                <TransitionBox enabled={settingEndTime}>
                    <EndTimeForm/>
                </TransitionBox>
            </Box>
        } */ }

        {(election.state !== 'draft' && election.state !== 'finalized') && 
            <Box sx={{width: '100%', maxWidth: 300}}>
                <ShareButton url={`${window.location.origin}/${election.election_id}`} />
            </Box>
        }
        {election.state === 'draft' && <FinalizeSection /> }

        
    </>
}