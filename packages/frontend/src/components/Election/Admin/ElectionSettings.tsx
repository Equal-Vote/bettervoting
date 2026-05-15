import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import { FormGroup, Radio, RadioGroup, Box, TextField, capitalize, Typography } from "@mui/material";
import structuredClone from '@ungap/structured-clone';
import { ElectionSettings as IElectionSettings, TermType } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { Tip } from '~/components/styles';
import { useSubstitutedTranslation, SwitchSetting, SwitchSettingProps } from '~/components/util';
import useElection from '~/components/ElectionContextProvider';
import useSyncedState from "~/hooks/useSyncedState";
import { AdminPageNavigation } from '../Sidebar';
import ShareButton from '../ShareButton';
import { useSetOpenState, useSetPublicResults } from '~/hooks/useAPI';

type ElectionSwitchSettingProps = {
    settingKey: keyof IElectionSettings;
    disabled?: boolean;
    disabledMessage?: string;
    onToggle?: (newValue: boolean) => Promise<boolean>;
    label?: string;
    availableDuringElection?: boolean;
}

export default function ElectionSettings() {
    const { election, updateElection, permissions, refreshElection: fetchElection } = useElection()
    const min_rankings = 3;
    const max_rankings = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const default_rankings = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;

    const {t} = useSubstitutedTranslation(election.settings.term_type, {min_rankings, max_rankings});

    function ElectionSwitchSetting({ settingKey, disabled, disabledMessage, onToggle: onToggleOverride, label, availableDuringElection=false}: ElectionSwitchSettingProps) {
        const defaultOnToggle = async (v: boolean) => !! await updateElection(e => { (e.settings as unknown as Record<string, unknown>)[settingKey] = v; });
        const isDisabled = disabled ?? (election.state !== 'draft' && !availableDuringElection);

        const [localToggled, setLocalToggled] = useSyncedState(!!election.settings[settingKey], onToggleOverride ?? defaultOnToggle);

        return <SwitchSetting
            label={label ?? t(`election_settings.${settingKey}`)}
            toggled={localToggled}
            onToggle={setLocalToggled}
            disabled={isDisabled}
            disabledMessage={disabledMessage}
        />;
    }

    const [contactEmail, setContactEmail] = useSyncedState(
        election.settings.contact_email ?? '',
        async (v) => !! await updateElection(e => e.settings.contact_email = v)
    );

    const [term, setTerm] = useSyncedState(
        election.settings.term_type,
        async (v) => !! await updateElection(e => e.settings.term_type = v )
    );

    const [currentMaxRankings, setCurrentMaxRankings] = useSyncedState(
        election.settings.max_rankings ? election.settings.max_rankings : default_rankings,
        async (v) => !! await updateElection(e => e.settings.max_rankings = v)
    );

    const { makeRequest: makePublicResultsRequest } = useSetPublicResults(election.election_id)

    const [publicResults, setPublicResults] = useSyncedState(
        election.settings.public_results ?? false,
        async (v) => {
            const res = await makePublicResultsRequest({ public_results: v, expected_update_date: election.update_date as string });
            return !!res && res.election?.settings?.public_results === v;
        }
    );

    return <>
        <Grid item xs={12} sx={{ m: 0, my: 0, p: 1 }}>
            <FormControl disabled={election.state !== 'draft'} component="fieldset" variant="standard">
                <FormGroup>
                    <FormControlLabel control={
                        <TextField
                            id="contact_email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
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
                                        onChange={() => setTerm(type as TermType)}
                                        checked={term === type}
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
                        onToggle={async (v) => !! await updateElection(e => e.settings.max_rankings = v ? default_rankings : undefined)}
                    />

                    <TextField
                        id="rank-limit"
                        type="number"
                        value={currentMaxRankings}
                        onChange={(e) => setCurrentMaxRankings(Number(e.target.value))}
                        variant='standard'
                        InputProps={{ inputProps: { min: min_rankings, max: max_rankings, "aria-label": "Rank Limit" } }}
                        sx={{ pl: 4, mt: -1, display: 'block'}}
                        disabled={election.state !== 'draft' || !election.settings.max_rankings}
                    />
                    {/* Note: this can't use ElectionSwitchSetting because we need to use the results from makePublicResultsRequest as the source of truth */}
                    <SwitchSetting
                        label={election.state === 'closed' || election.state === 'archived' ? t('election_settings.public_results') : t('election_settings.preliminary_results')}
                        toggled={publicResults}
                        onToggle={setPublicResults}
                    />
                </FormGroup>
            </FormControl>
        </Grid>
        
        

        <AdminPageNavigation />
    </>
}
