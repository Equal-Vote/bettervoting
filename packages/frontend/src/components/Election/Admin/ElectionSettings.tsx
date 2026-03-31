import React, { useEffect, useState } from 'react'
import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Typography from '@mui/material/Typography';
import { Checkbox, FormGroup, Radio, RadioGroup, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Box, IconButton, TextField, capitalize } from "@mui/material"
import structuredClone from '@ungap/structured-clone';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ElectionSettings as IElectionSettings, TermType, electionSettingsValidation } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { ElectionState } from '@equal-vote/star-vote-shared/domain_model/ElectionStates';
import { Tip } from '~/components/styles';
import useSnackbar from '~/components/SnackbarContext';
import { useSubstitutedTranslation } from '~/components/util';
import useElection from '~/components/ElectionContextProvider';
export default function ElectionSettings() {
    const { election, refreshElection, updateElection } = useElection()
    const { setSnack } = useSnackbar()
    const min_rankings = 3;
    const max_rankings = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const default_rankings = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;
    const ballotUpdatesConditionsMet = election.settings.voter_access !== 'open' && election.settings.invitation === 'email';

    const {t} = useSubstitutedTranslation(election.settings.term_type, {min_rankings, max_rankings});

    const [editedElectionSettings, se] = useState(election.settings);
    const setEditedElectionSettings = (value) => {
        // keeping the local election object in sync avoids consistency issues when navigating between pages
        election.settings = value;
        se(value);
    }

    // Sync state when election context changes
    useEffect(() => {
        setEditedElectionSettings(election.settings);
    }, [election]);

    const applySettingsUpdate = async (updateFunc: (settings: IElectionSettings) => void) => {
        const originalSettings = structuredClone(editedElectionSettings);
        const settingsCopy = structuredClone(editedElectionSettings);
        updateFunc(settingsCopy);
        setEditedElectionSettings(settingsCopy);
        await updateElection(election => {
            election.settings = settingsCopy
        }).then((result) => {
            if(result === false){
                setEditedElectionSettings(originalSettings)
                refreshElection();
            }else{
                console.log(result.election.settings)
            }
        });
    };

    interface CheckboxSettingProps {
        setting: string
        disabled?: boolean
        checked?: boolean
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void                
        helperKey?: string
    }

    const CheckboxSetting = ({setting, disabled=undefined, checked=undefined, onChange=undefined, helperKey=undefined}: CheckboxSettingProps) => <>
        <FormControlLabel disabled={disabled} control={
            <Checkbox
                id={setting}
                name={`${t(`election_settings.${setting}`)}`}
                checked={disabled ? !!checked : (checked ?? !!editedElectionSettings[setting])}
                onChange={onChange ?? ((e) => applySettingsUpdate(settings => { settings[setting] = e.target.checked; }))}
                sx={{mb: 1}}
            />}
            label={t(`election_settings.${setting}`)}
        />
        {disabled && <FormHelperText hidden={!disabled} sx={{ mb:2, mt:0, lineHeight: 0, fontStyle: 'italic', textAlign: 'center' }}>{t(`disabled_msgs.${helperKey ?? setting}`)}</FormHelperText>}
    </>;

    return <Grid item xs={12} sx={{ m: 0, my: 0, p: 1 }}>
        <FormControl disabled={election.state !== 'draft'} component="fieldset" variant="standard">
            <FormGroup>
                <FormControlLabel control={
                    <TextField
                        id="contact_email"
                        value={editedElectionSettings.contact_email ? editedElectionSettings.contact_email : ''}
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
                                    checked={editedElectionSettings.term_type === type}
                                    value={t(`keyword.${type}.election`)}
                                />}
                                label={capitalize(t(`keyword.${type}.election`))}
                            />
                        )}
                    </RadioGroup>
                </Box>
                
                <CheckboxSetting setting='random_candidate_order' />
                <CheckboxSetting setting='ballot_updates' />
                <CheckboxSetting setting='require_instruction_confirmation'/>
                <CheckboxSetting setting='draggable_ballot'/>
                <CheckboxSetting setting='is_public'/>
                <CheckboxSetting setting='max_rankings' onChange={(e) => applySettingsUpdate(settings => {
                    settings.max_rankings = e.target.checked ? default_rankings : undefined })
                }/>

                <TextField
                    id="rank-limit"
                    type="number"
                    value={editedElectionSettings.max_rankings ? editedElectionSettings.max_rankings : default_rankings}
                    onChange={(e) => applySettingsUpdate((settings) => { settings.max_rankings = Number(e.target.value) })}
                    variant='standard'
                    InputProps={{ inputProps: { min: min_rankings, max: max_rankings, "aria-label": "Rank Limit" } }}
                    sx={{ pl: 4, mt: -1, display: 'block'}}
                    disabled={election.state !== 'draft' || !editedElectionSettings.max_rankings}
                />
            </FormGroup>
        </FormControl>
    </Grid >
}
