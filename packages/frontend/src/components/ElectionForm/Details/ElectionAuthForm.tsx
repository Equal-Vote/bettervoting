import { FormControl, FormControlLabel, FormLabel, Grid, Paper, Radio, Typography } from "@mui/material"
import useElection from '../../ElectionContextProvider';
import { useSubstitutedTranslation } from '~/components/util';
import {
    getVoterAuthenticationMode,
    setVoterAuthenticationMode,
    VoterAuthenticationMode,
} from '@equal-vote/star-vote-shared/domain_model/VoterAuthenticationMode';

export default function ElectionAuthForm() {

    const { election, refreshElection, updateElection } = useElection()
    // Try to read the canonical mode; legacy non-canonical rows leave all radios unchecked.
    let currentMode: VoterAuthenticationMode | null;
    try { currentMode = getVoterAuthenticationMode(election.settings); } catch { currentMode = null; }
    const device_id = currentMode === 'open_unique_cookie';
    const email     = currentMode === 'open_unique_keycloak';
    const ip        = currentMode === 'open_unique_ip_address';
    const none      = currentMode === 'open_open';

    const handleUpdate = async (mode: VoterAuthenticationMode) => {
        await updateElection(e => { e.settings = setVoterAuthenticationMode(e.settings, mode); })
        await refreshElection()
    }

    const {t} = useSubstitutedTranslation(election.settings.term_type);

    return (
        <Paper elevation={3} sx={{p: 4, width: '100%'}}>
            <Grid container
                sx={{
                    m: 0,
                    p: 0,
                }}
            >
                <Grid item xs={12} sx={{marginBottom: 1}}>
                    <Typography gutterBottom variant="h4" component="h4">
                        {t('admin_home.voter_authentication.form_label')}
                    </Typography>
                </Grid>
                <FormControl>
                    <FormLabel id="demo-radio-buttons-group-label" sx={{marginBottom: 1, color: '#000000DE'}}>
                        {t('admin_home.voter_authentication.help_text')}
                    </FormLabel>
                    <FormControlLabel control={
                        <Radio
                            disabled = {election.state !== 'draft'}
                            checked={device_id}
                            onChange={() => handleUpdate('open_unique_cookie')}
                            value="device_id"
                        />}
                        label={t('admin_home.voter_authentication.device_label')} />
                    <FormControlLabel control={
                        <Radio
                            disabled = {election.state !== 'draft'}
                            checked={email}
                            onChange={() => handleUpdate('open_unique_keycloak')}
                            value="email"
                        />}
                        label={t('admin_home.voter_authentication.email_label')} />
                    <FormControlLabel control={
                        <Radio
                            disabled = {election.state !== 'draft'}
                            checked={ip}
                            onChange={() => handleUpdate('open_unique_ip_address')}
                            value="ip"
                        />}
                        label={t('admin_home.voter_authentication.ip_label')} />
                    <FormControlLabel control={
                        <Radio
                            disabled = {election.state !== 'draft'}
                            checked={none}
                            onChange={() => handleUpdate('open_open')}
                            value="none"
                        />}
                        label={t('admin_home.voter_authentication.no_limit_label')} />
                </FormControl>
            </Grid>
        </Paper>
    )
}
