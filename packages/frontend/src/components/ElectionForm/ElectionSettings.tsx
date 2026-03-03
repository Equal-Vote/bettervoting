import React, { useEffect, useState } from 'react'
import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Typography from '@mui/material/Typography';
import { Checkbox, FormGroup, Radio, RadioGroup, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Box, IconButton, TextField, capitalize } from "@mui/material"
import { PrimaryButton, SecondaryButton, Tip } from '../styles';
import useElection  from '../ElectionContextProvider';
import structuredClone from '@ungap/structured-clone';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useSubstitutedTranslation } from '../util';
import { ElectionSettings as IElectionSettings, TermType, electionSettingsValidation } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { ElectionState } from '@equal-vote/star-vote-shared/domain_model/ElectionStates';
import useSnackbar from '../SnackbarContext';

export default function ElectionSettings() {
    const { election, refreshElection, updateElection } = useElection()
    const { setSnack } = useSnackbar()
    const min_rankings = 3;
    const max_rankings = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const default_rankings = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;
    const ballotUpdatesConditionsMet = election.settings.voter_access !== 'open' && election.settings.invitation === 'email';

    const {t} = useSubstitutedTranslation(election.settings.term_type, {min_rankings, max_rankings});

    const [editedElectionSettings, setEditedElectionSettings] = useState(election.settings);
    const [publicResults, setPublicResults] = useState(election.settings.public_results);
    const [ballotUpdates, setBallotUpdates] = useState(election.settings.ballot_updates);

    // Enforce mutual exclusion of ballot updates feature and preliminary results
    const [ballotUpdatesDisabled, setBallotUpdatesDisabled] = useState(!ballotUpdatesConditionsMet || election.settings.public_results);
    const [publicResultsDisabled, setPublicResultsDisabled] = useState(election.settings.ballot_updates);
    const [ballotUpdatesDisabledMsg, setBallotUpdatesDisabledMsg] = useState(ballotUpdatesConditionsMet && election.settings.public_results);

    // Sync state when election context changes
    const syncState = () => {
        setEditedElectionSettings(election.settings);
        setPublicResults(election.settings.public_results);
        setBallotUpdates(election.settings.ballot_updates);
        setBallotUpdatesDisabled(!ballotUpdatesConditionsMet || election.settings.public_results);
        setBallotUpdatesDisabledMsg(ballotUpdatesConditionsMet && election.settings.public_results);
        setPublicResultsDisabled(election.settings.ballot_updates);
    };
    useEffect(() => {
        syncState();
    }, [election]);

    const applySettingsUpdate = (updateFunc: (settings: IElectionSettings) => void) => {
        const settingsCopy = structuredClone(editedElectionSettings);
        updateFunc(settingsCopy);
        setEditedElectionSettings(settingsCopy);
    };

    const validatePage = (electionSettings:IElectionSettings, electionState: ElectionState) => {
        // Placeholder function
        return electionSettingsValidation(electionSettings, electionState);
    }

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        syncState();
    };

    const onSave = async () => {
        if (validatePage(editedElectionSettings, election.state)) {
            setSnack({
                message: validatePage(editedElectionSettings, election.state),
                severity: 'error',
                open: true,
                autoHideDuration: 6000,
            })
            return false
        }
        const success = await updateElection(election => {
            election.settings = editedElectionSettings
        })
        if (!success) return false
        await refreshElection()
        setOpen(false);
    }
    interface CheckboxSettingProps {
        setting: string
        disabled?: boolean
        checked?: boolean
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
        hidden?: boolean
        helperText?: boolean
    }
    const onChangeBallotUpdates = async(e) => {
         setBallotUpdates(e.target.checked);
         setPublicResultsDisabled(e.target.checked);
         applySettingsUpdate(settings => {
             settings.ballot_updates = e.target.checked;
         });
    };
    const onChangePublicResults = async(e) => {
         setPublicResults(e.target.checked);
         setBallotUpdatesDisabled(!ballotUpdatesConditionsMet || e.target.checked);
         setBallotUpdatesDisabledMsg(ballotUpdatesConditionsMet && e.target.checked);
         applySettingsUpdate(settings => { settings.public_results = e.target.checked; });
    };
    const CheckboxSetting = ({setting, disabled=undefined, checked=undefined, onChange=undefined, hidden=false, helperText=false}: CheckboxSettingProps) => <>
            <FormControlLabel hidden = {hidden} disabled={disabled} control={
                <Checkbox
                    id={setting}
                    name={`${t(`election_settings.${setting}`)}`}
                    checked={disabled ? !!checked : (checked ?? !!editedElectionSettings[setting])}
                    onChange={onChange ?? ((e) => applySettingsUpdate(settings => { settings[setting] = e.target.checked; }))}
                    sx={{mb: 1}}
                    hidden={hidden}
                />}
                label={t(`election_settings.${setting}`)}
            />
        <FormHelperText hidden={!helperText} sx={{ mb:2, mt:0, lineHeight: 0, fontStyle: 'italic', textAlign: 'center' }}>{t(`disabled_msgs.${setting}`)}</FormHelperText>
    </>;

    return (
        <Paper elevation={3} sx={{width: '100%', px: 4, py: 1}}>
            <Box
                sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 10 }}
                alignItems={'center'}
            >
                <Box sx={{ width: '100%', pl: 2 }}>
                    <Typography variant="h4" component="h4">{t('election_settings.button_title')}</Typography>
                </Box>
                <Box sx={{ flexShrink: 1, p: 1 }}>
                    <IconButton
                        aria-label="Edit Settings"
                        onClick={handleOpen}>
                        {election.state  === 'draft' ? <EditIcon /> : <VisibilityIcon />}
                    </IconButton>
                </Box>
            </Box>
            <Dialog
                open={open}
                onClose={handleClose}
            >
                <DialogTitle sx={{m: 0}}>{t('election_settings.dialog_title')}</DialogTitle>
                <DialogContent >
                    <Grid item xs={12} sx={{ m: 0, my: 0, p: 1 }}>
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
                                { ballotUpdatesConditionsMet && <CheckboxSetting setting='ballot_updates' hidden={!ballotUpdatesConditionsMet}
                                    disabled={election.state !== 'draft' || ballotUpdatesDisabled} checked={ballotUpdates} onChange={onChangeBallotUpdates} helperText={ballotUpdatesDisabledMsg}/>}
                                { ['draft', 'finalized', 'open'].includes(election.state) && <CheckboxSetting setting='public_results' checked={publicResults}
                                    onChange={onChangePublicResults} disabled={election.state !== 'draft' || publicResultsDisabled} helperText={publicResultsDisabled}/>}
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
                </DialogContent>
                <DialogActions>
                    { election.state === 'draft' ?
                        <>
                            <SecondaryButton
                                type='button'
                                fullWidth={false}
                                onClick={handleClose}
                            >
                                {t('keyword.cancel')}
                            </SecondaryButton>
                            <PrimaryButton
                                type='button'
                                variant='contained'
                                fullWidth={false}
                                onClick={() => onSave()}
                            >
                                {t('keyword.save')}
                            </PrimaryButton>
                        </>
                    :
                        <PrimaryButton
                            type='button'
                            variant='contained'
                            fullWidth={false}
                            onClick={handleClose}
                        >
                            {t('keyword.close')}
                        </PrimaryButton>
                    }
                </DialogActions>
            </Dialog>
        </Paper>
    )
}
