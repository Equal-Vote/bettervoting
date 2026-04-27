import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { FormGroup, Radio, RadioGroup, Box, TextField, capitalize, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { ElectionSettings as IElectionSettings, TermType } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
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
    const { election, updateElection, trackSave, refreshElection } = useElection()
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

    // Text fields hold local state and commit on blur, so each keystroke doesn't fire a save.
    const [contactEmailDraft, setContactEmailDraft] = useState(election.settings.contact_email ?? '');
    useEffect(() => { setContactEmailDraft(election.settings.contact_email ?? ''); }, [election.settings.contact_email]);

    const [maxRankingsDraft, setMaxRankingsDraft] = useState<number>(election.settings.max_rankings ?? default_rankings);
    useEffect(() => { setMaxRankingsDraft(election.settings.max_rankings ?? default_rankings); }, [election.settings.max_rankings, default_rankings]);

    const { makeRequest: makePublicResultsRequest } = useSetPublicResults(election.election_id)

    const publicResults = election.settings.public_results ?? false;
    const togglePublicResults = async (v: boolean) => {
        const res = await trackSave(makePublicResultsRequest({ public_results: v }));
        if (res !== false) await refreshElection();
    };

    return <>
        <Grid item xs={12} sx={{ m: 0, my: 0, p: 1 }}>
            <FormControl disabled={election.state !== 'draft'} component="fieldset" variant="standard">
                <FormGroup>
                    <FormControlLabel control={
                        <TextField
                            id="contact_email"
                            value={contactEmailDraft}
                            onChange={(e) => setContactEmailDraft(e.target.value)}
                            onBlur={() => {
                                if (contactEmailDraft !== (election.settings.contact_email ?? '')) {
                                    updateElection(e => e.settings.contact_email = contactEmailDraft);
                                }
                            }}
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
                    <ElectionSwitchSetting settingKey="ballot_updates" />
                    <ElectionSwitchSetting settingKey="require_instruction_confirmation" />
                    <ElectionSwitchSetting settingKey="draggable_ballot" />
                    <ElectionSwitchSetting
                        settingKey="max_rankings"
                        onToggle={(v) => updateElection(e => e.settings.max_rankings = v ? default_rankings : undefined)}
                    />

                    <TextField
                        id="rank-limit"
                        type="number"
                        value={maxRankingsDraft}
                        onChange={(e) => setMaxRankingsDraft(Number(e.target.value))}
                        onBlur={() => {
                            if (maxRankingsDraft !== election.settings.max_rankings) {
                                updateElection(e => e.settings.max_rankings = maxRankingsDraft);
                            }
                        }}
                        variant='standard'
                        InputProps={{ inputProps: { min: min_rankings, max: max_rankings, "aria-label": "Rank Limit" } }}
                        sx={{ pl: 4, mt: -1, display: 'block'}}
                        disabled={election.state !== 'draft' || !election.settings.max_rankings}
                    />
                    {/* setPublicResults goes through its own endpoint, so it bypasses updateElection but still participates in the form-lock via trackSave. */}
                    <SwitchSetting
                        label={election.state === 'closed' || election.state === 'archived' ? t('election_settings.public_results') : t('election_settings.preliminary_results')}
                        toggled={publicResults}
                        onToggle={togglePublicResults}
                    />
                </FormGroup>
            </FormControl>
        </Grid>
        
        

        <AdminPageNavigation />
    </>
}
