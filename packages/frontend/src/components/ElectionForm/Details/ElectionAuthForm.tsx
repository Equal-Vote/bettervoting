import { FormControl, FormControlLabel, FormLabel, Grid, Paper, Radio, Typography } from "@mui/material"
import useElection from '../../ElectionContextProvider';
import { useSubstitutedTranslation } from '~/components/util';

export default function ElectionAuthForm() {

    const { election, refreshElection, updateElection } = useElection()
    const ip = election.settings.voter_authentication.ip_address == true
    const device_id = election.settings.voter_authentication.voter_id == true
    const email = election.settings.voter_authentication.email == true
    const none = !(ip || device_id || email)

    const handleUpdate = async (voter_authentication) => {
        await updateElection(election => election.settings.voter_authentication = voter_authentication)
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
                            onChange={() => handleUpdate({ voter_id: true })}
                            value="device_id"
                        />}
                        label={t('admin_home.voter_authentication.device_label')} />
                    <FormControlLabel control={
                        <Radio
                            disabled = {election.state !== 'draft'}
                            checked={email}
                            onChange={() => handleUpdate({ email: true })}
                            value="email"
                        />}
                        label={t('admin_home.voter_authentication.email_label')} />
                    <FormControlLabel control={
                        <Radio
                            disabled = {election.state !== 'draft'}
                            checked={ip}
                            onChange={() => handleUpdate({ ip_address: true })}
                            value="ip"
                        />}
                        label={t('admin_home.voter_authentication.ip_label')} />
                    <FormControlLabel control={
                        <Radio
                            disabled = {election.state !== 'draft'}
                            checked={none}
                            onChange={() => handleUpdate({})}
                            value="none"
                        />}
                        label={t('admin_home.voter_authentication.no_limit_label')} />
                </FormControl>
            </Grid>
        </Paper>
    )
}
