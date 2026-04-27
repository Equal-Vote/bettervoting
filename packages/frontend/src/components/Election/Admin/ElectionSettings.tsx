import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormGroup, Radio, RadioGroup, Box, TextField, capitalize, Typography } from "@mui/material";
import { useState } from "react";
import { ElectionSettings as IElectionSettings, TermType } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { emailRegex } from '@equal-vote/star-vote-shared/domain_model/Util';
import { Tip } from '~/components/styles';
import { useSubstitutedTranslation, SwitchSetting } from '~/components/util';
import useElection from '~/components/ElectionContextProvider';
import { AdminPageNavigation } from '../Sidebar';
import { useSetPublicResults } from '~/hooks/useAPI';

type ElectionSwitchSettingProps = {
    settingKey: keyof IElectionSettings;
    disabled?: boolean;
    disabledMessage?: string;
    onToggle?: (newValue: boolean) => Promise<unknown>;
    label?: string;
    availableDuringElection?: boolean;
}

export default function ElectionSettings() {
    const { election, updateElection, trackSave, refreshElection, isSaving } = useElection()
    const min_rankings = 3;
    const max_rankings = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const default_rankings = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;

    const {t} = useSubstitutedTranslation(election.settings.term_type, {min_rankings, max_rankings});

    function ElectionSwitchSetting({ settingKey, disabled, disabledMessage, onToggle: onToggleOverride, label, availableDuringElection=false}: ElectionSwitchSettingProps) {
        const defaultOnToggle = (v: boolean) => updateElection(e => { (e.settings as unknown as Record<string, unknown>)[settingKey] = v; });
        const isDisabled = disabled ?? (election.state !== 'draft' && !availableDuringElection);
        const toggled = !!election.settings[settingKey];

        return <SwitchSetting
            label={label ?? t(`election_settings.${settingKey}`)}
            toggled={toggled}
            onToggle={onToggleOverride ?? defaultOnToggle}
            disabled={isDisabled}
            disabledMessage={disabledMessage}
        />;
    }

    // Contact email is edited in a modal so the rest of the page can't be touched mid-edit.
    // Open → seed draft from saved value. Save → commit, close on success. Cancel → drop draft.
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [contactEmailDraft, setContactEmailDraft] = useState(election.settings.contact_email ?? '');
    const contactEmailDirty = contactEmailDraft !== (election.settings.contact_email ?? '');
    // Empty is allowed (the field is optional). Anything non-empty must look like an email.
    const contactEmailValid = contactEmailDraft === '' || emailRegex.test(contactEmailDraft);
    const openEmailDialog = () => {
        setContactEmailDraft(election.settings.contact_email ?? '');
        setEmailDialogOpen(true);
    };
    const closeEmailDialog = () => setEmailDialogOpen(false);
    const commitContactEmail = async () => {
        if (!contactEmailValid) return;
        if (!contactEmailDirty) { closeEmailDialog(); return; }
        const res = await updateElection(e => e.settings.contact_email = contactEmailDraft);
        if (res !== false) closeEmailDialog();
    };

    // Rank-limit edits go through a modal so toggling-on requires picking a value, and the
    // displayed number always reflects what's saved (no draft-but-uncommitted state).
    // Draft is held as a string so an empty input stays empty (rather than being coerced to 0
    // by Number('')), letting the user backspace and type a fresh number cleanly.
    const [rankLimitDialogOpen, setRankLimitDialogOpen] = useState(false);
    const [maxRankingsDraft, setMaxRankingsDraft] = useState<string>(String(election.settings.max_rankings ?? default_rankings));
    const parsedMaxRankings = maxRankingsDraft === '' ? null : Number(maxRankingsDraft);
    const maxRankingsValid = parsedMaxRankings !== null
        && Number.isInteger(parsedMaxRankings)
        && parsedMaxRankings >= min_rankings
        && parsedMaxRankings <= max_rankings;
    const showMaxRankingsError = maxRankingsDraft !== '' && !maxRankingsValid;
    const handleMaxRankingsToggle = (on: boolean) => {
        if (!on) return updateElection(e => e.settings.max_rankings = undefined);
        // Turning ON requires choosing a value — open the modal seeded with the default.
        setMaxRankingsDraft(String(default_rankings));
        setRankLimitDialogOpen(true);
    };
    const openRankLimitDialog = () => {
        setMaxRankingsDraft(String(election.settings.max_rankings ?? default_rankings));
        setRankLimitDialogOpen(true);
    };
    const closeRankLimitDialog = () => setRankLimitDialogOpen(false);
    const commitMaxRankings = async () => {
        if (!maxRankingsValid || parsedMaxRankings === null) return;
        const res = await updateElection(e => e.settings.max_rankings = parsedMaxRankings);
        if (res !== false) closeRankLimitDialog();
    };

    const { makeRequest: makePublicResultsRequest } = useSetPublicResults(election.election_id)

    const publicResults = election.settings.public_results ?? false;
    const togglePublicResults = async (v: boolean) => {
        const res = await trackSave(makePublicResultsRequest({ public_results: v }));
        if (res !== false) await refreshElection();
    };

    // Mirror the server's settingsCompatiblityValidation (shared/ElectionSettings.ts) so users can't
    // submit a request that would be 400'd. ballot_updates ↔ public_results are mutually exclusive
    // except in closed/archived states (where "public_results" is final, not preliminary).
    const ballotUpdatesConditionsMet = election.settings.voter_access !== 'open' && election.settings.invitation === 'email';
    const isFinalState = election.state === 'closed' || election.state === 'archived';
    const ballotUpdatesDisabled = !ballotUpdatesConditionsMet || (!!election.settings.public_results && !isFinalState);
    const ballotUpdatesDisabledMsg = ballotUpdatesConditionsMet && !!election.settings.public_results && !isFinalState
        ? t('disabled_msgs.ballot_updates_with_prelim')
        : undefined;
    const publicResultsDisabled = !!election.settings.ballot_updates && !isFinalState;
    const publicResultsDisabledMsg = publicResultsDisabled
        ? t('disabled_msgs.public_results')
        : undefined;

    return <>
        <Grid item xs={12} sx={{ m: 0, my: 0, p: 1 }}>
            <FormControl disabled={election.state !== 'draft'} component="fieldset" variant="standard">
                <FormGroup>
                    <Box sx={{mb: 3}}>
                        <Typography component='div' variant='body2' color='text.secondary'>
                            {t('election_settings.contact_email')}
                        </Typography>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 0.5}}>
                            <Typography component='div' sx={{flex: 1, color: election.settings.contact_email ? 'text.primary' : 'text.disabled'}}>
                                {election.settings.contact_email || 'not set'}
                            </Typography>
                            <Button
                                size='small'
                                onClick={openEmailDialog}
                                disabled={election.state !== 'draft'}
                            >
                                Edit
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{mt: 0, mb: 2}}>
                        <Typography component='span'>
                            {t('wizard.term_question')}
                            <Tip name='polls_vs_elections'/>
                        </Typography>
                        <RadioGroup row>
                            {['poll', 'election'].map( (type, i) =>
                                <FormControlLabel
                                    key={i}
                                    control={<Radio
                                        onChange={() => updateElection(e => e.settings.term_type = type as TermType)}
                                        checked={election.settings.term_type === type}
                                        value={t(`keyword.${type}.election`)}
                                    />}
                                    label={capitalize(t(`keyword.${type}.election`))}
                                />
                            )}
                        </RadioGroup>
                    </Box>

                    <ElectionSwitchSetting settingKey="random_candidate_order" />
                    <ElectionSwitchSetting
                        settingKey="ballot_updates"
                        disabled={election.state !== 'draft' || ballotUpdatesDisabled}
                        disabledMessage={ballotUpdatesDisabledMsg}
                    />
                    <ElectionSwitchSetting settingKey="require_instruction_confirmation" />
                    <ElectionSwitchSetting settingKey="draggable_ballot" />
                    <ElectionSwitchSetting
                        settingKey="max_rankings"
                        onToggle={handleMaxRankingsToggle}
                    />
                    {!!election.settings.max_rankings && (
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, pl: 4, mt: -1, mb: 1}}>
                            <Typography component='div' variant='body2' color='text.secondary'>
                                Rank limit: {election.settings.max_rankings}
                            </Typography>
                            <Button
                                size='small'
                                onClick={openRankLimitDialog}
                                disabled={election.state !== 'draft'}
                            >
                                Edit
                            </Button>
                        </Box>
                    )}
                    {/* setPublicResults goes through its own endpoint, so it bypasses updateElection but still participates in the form-lock via trackSave. */}
                    <SwitchSetting
                        label={election.state === 'closed' || election.state === 'archived' ? t('election_settings.public_results') : t('election_settings.preliminary_results')}
                        toggled={publicResults}
                        onToggle={togglePublicResults}
                        disabled={publicResultsDisabled}
                        disabledMessage={publicResultsDisabledMsg}
                    />
                </FormGroup>
            </FormControl>
        </Grid>
        
        

        <AdminPageNavigation />

        <Dialog
            open={emailDialogOpen}
            onClose={() => { if (!isSaving) closeEmailDialog(); }}
            maxWidth='xs'
            fullWidth
        >
            <DialogTitle>{t('tips.contact_email.title')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin='dense'
                    type='email'
                    value={contactEmailDraft}
                    onChange={(e) => setContactEmailDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSaving && contactEmailValid) { e.preventDefault(); commitContactEmail(); }
                    }}
                    fullWidth
                    variant='standard'
                    disabled={isSaving}
                    error={!contactEmailValid}
                    helperText={!contactEmailValid ? 'Enter a valid email address (or leave blank).' : ' '}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={closeEmailDialog} disabled={isSaving}>Cancel</Button>
                <Button onClick={commitContactEmail} disabled={isSaving || !contactEmailDirty || !contactEmailValid} variant='contained'>
                    {isSaving ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>

        <Dialog
            open={rankLimitDialogOpen}
            onClose={() => { if (!isSaving) closeRankLimitDialog(); }}
            maxWidth='xs'
            fullWidth
        >
            <DialogTitle>{t('tips.max_rankings.title')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin='dense'
                    type='number'
                    value={maxRankingsDraft}
                    onChange={(e) => setMaxRankingsDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSaving && maxRankingsValid) { e.preventDefault(); commitMaxRankings(); }
                    }}
                    fullWidth
                    variant='standard'
                    disabled={isSaving}
                    error={showMaxRankingsError}
                    helperText={showMaxRankingsError ? `Enter a whole number between ${min_rankings} and ${max_rankings}.` : ' '}
                    InputProps={{ inputProps: { min: min_rankings, max: max_rankings, "aria-label": "Rank Limit" } }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={closeRankLimitDialog} disabled={isSaving}>Cancel</Button>
                <Button onClick={commitMaxRankings} disabled={isSaving || !maxRankingsValid} variant='contained'>
                    {isSaving ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    </>
}
