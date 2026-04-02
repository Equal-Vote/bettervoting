import { useEffect, useState } from 'react'
import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Typography from '@mui/material/Typography';
import { FormGroup, Radio, RadioGroup, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Box, IconButton, TextField, capitalize } from "@mui/material"
import structuredClone from '@ungap/structured-clone';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ElectionSettings as IElectionSettings, TermType, electionSettingsValidation } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { ElectionState } from '@equal-vote/star-vote-shared/domain_model/ElectionStates';
import { Tip } from '~/components/styles';
import useSnackbar from '~/components/SnackbarContext';
import { useSubstitutedTranslation, SwitchSetting } from '~/components/util';
import useElection from '~/components/ElectionContextProvider';
export default function ElectionSettings() {
    const { election, refreshElection, updateElection } = useElection()
    //const { setSnack } = useSnackbar()
    const min_rankings = 3;
    const max_rankings = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const default_rankings = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;
    //const ballotUpdatesConditionsMet = election.settings.voter_access !== 'open' && election.settings.invitation === 'email';

    const {t} = useSubstitutedTranslation(election.settings.term_type, {min_rankings, max_rankings});

    //const [editedElectionSettings, se] = useState(election.settings);
    //const setEditedElectionSettings = (value) => {
    //    // keeping the local election object in sync avoids consistency issues when navigating between pages
    //    election.settings = value;
    //    se(value);
    //}

    // Sync state when election context changes
    //useEffect(() => {
    //    setEditedElectionSettings(election.settings);
    //}, [election]);

    const applySettingsUpdate = async (updateFunc: (settings: IElectionSettings) => void) => {
        //const originalSettings = structuredClone(editedElectionSettings);
        const settingsCopy = structuredClone(election.settings);
        updateFunc(settingsCopy);
        //setEditedElectionSettings(settingsCopy);
        return await updateElection(election => {
            election.settings = settingsCopy
        }).then((result) => {
            if(!result) refreshElection();
            return !!result
            //if(result === false){
            //    setEditedElectionSettings(originalSettings)
            //    refreshElection();
            //}else{
            //    console.log(result.election.settings)
            //}
        })
    };

    return <Grid item xs={12} sx={{ m: 0, my: 0, p: 1 }}>
        <FormControl disabled={election.state !== 'draft'} component="fieldset" variant="standard">
            <FormGroup>
                <FormControlLabel control={
                    <TextField
                        id="contact_email"
                        value={election.settings.contact_email ? election.settings.contact_email : ''}
                        onChange={(e) => applySettingsUpdate((settings) => { settings.contact_email = e.target.value })}
                        variant='standard'
                        fullWidth
                        sx={{ mt: -1, display: 'block'}}
                    />}
                    label={t('election_settings.contact_email')}
                    labelPlacement='top'
                    sx={{
                        alignItems: 'start',
                        mb: 3
                    }}
                />

                <Box sx={{mt: 3, mb: 2}}>
                    <FormLabel>
                        {t('wizard.term_question')}
                        <Tip name='polls_vs_elections'/>
                    </FormLabel>
                    <RadioGroup row>
                        {['poll', 'election'].map( (type, i) =>
                            <FormControlLabel
                                key={i}
                                control={<Radio
                                    onChange={(() => {
                                        applySettingsUpdate(settings => settings.term_type = type as TermType )
                                    })}
                                    checked={election.settings.term_type === type}
                                    value={t(`keyword.${type}.election`)}
                                />}
                                label={capitalize(t(`keyword.${type}.election`))}
                            />
                        )}
                    </RadioGroup>
                </Box>

                <SwitchSetting
                    label={t('election_settings.random_candidate_order')}
                    toggled={!!election.settings.random_candidate_order}
                    onToggle={(v) => applySettingsUpdate(s => { s.random_candidate_order = v })}
                />
                <SwitchSetting
                    label={t('election_settings.ballot_updates')}
                    toggled={!!election.settings.ballot_updates}
                    onToggle={async (v) => await applySettingsUpdate(s => { s.ballot_updates = v })}
                    disabled={election.settings.voter_access === 'open' || election.settings.invitation !== 'email' || !!election.settings.public_results}
                    disabledMessage={t(
                        election.settings.voter_access === 'open' || election.settings.invitation !== 'email'
                            ? 'disabled_msgs.ballot_updates_when_open'
                            : 'disabled_msgs.ballot_updates_with_prelim'
                    )}
                />
                <SwitchSetting
                    label={t('election_settings.require_instruction_confirmation')}
                    toggled={!!election.settings.require_instruction_confirmation}
                    onToggle={(v) => applySettingsUpdate(s => { s.require_instruction_confirmation = v })}
                />
                <SwitchSetting
                    label={t('election_settings.draggable_ballot')}
                    toggled={!!election.settings.draggable_ballot}
                    onToggle={(v) => applySettingsUpdate(s => { s.draggable_ballot = v })}
                />
                <SwitchSetting
                    label={t('election_settings.max_rankings')}
                    toggled={!!election.settings.max_rankings}
                    onToggle={(v) => applySettingsUpdate(s => { s.max_rankings = v ? default_rankings : undefined })}
                />

                <TextField
                    id="rank-limit"
                    type="number"
                    value={election.settings.max_rankings ? election.settings.max_rankings : default_rankings}
                    onChange={(e) => applySettingsUpdate((settings) => { settings.max_rankings = Number(e.target.value) })}
                    variant='standard'
                    InputProps={{ inputProps: { min: min_rankings, max: max_rankings, "aria-label": "Rank Limit" } }}
                    sx={{ pl: 4, mt: -1, display: 'block'}}
                    disabled={election.state !== 'draft' || !election.settings.max_rankings}
                />
            </FormGroup>
        </FormControl>
    </Grid >
}
