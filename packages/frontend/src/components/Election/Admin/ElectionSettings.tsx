import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { FormGroup, Radio, RadioGroup, Box, capitalize, Typography } from "@mui/material";
import { ElectionSettings as IElectionSettings, TermType } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { Tip } from '~/components/styles';
import { useSubstitutedTranslation, SwitchSetting } from '~/components/util';
import useElection from '~/components/ElectionContextProvider';
import useOptimisticToggle from "~/hooks/useOptimisticToggle";
import { AdminPageNavigation } from '../Sidebar';
import { useSetPublicResults } from '~/hooks/useAPI';
import DialogTextField from '~/components/DialogTextField';

type ElectionSwitchSettingProps = {
    settingKey: keyof IElectionSettings;
    disabled?: boolean;
    disabledMessage?: string;
    onToggle?: (newValue: boolean) => Promise<boolean>;
    label?: string;
    availableDuringElection?: boolean;
}

// Defined at module scope (not inside ElectionSettings) so its identity stays
// stable across parent re-renders. If it were inline, every parent render
// would create a new function reference and React would unmount/remount the
// MUI Switch, eating its slide animation.
function ElectionSwitchSetting({ settingKey, disabled, disabledMessage, onToggle: onToggleOverride, label, availableDuringElection=false}: ElectionSwitchSettingProps) {
    const { election, updateElection } = useElection();
    const {t} = useSubstitutedTranslation(election.settings.term_type);
    const defaultOnToggle = async (v: boolean) => !! await updateElection(e => { (e.settings as unknown as Record<string, unknown>)[settingKey] = v; });
    const isDisabled = disabled ?? (election.state !== 'draft' && !availableDuringElection);

    const [localToggled, setLocalToggled] = useOptimisticToggle(!!election.settings[settingKey], onToggleOverride ?? defaultOnToggle);

    return <SwitchSetting
        label={label ?? t(`election_settings.${settingKey}`)}
        toggled={localToggled}
        onToggle={setLocalToggled}
        disabled={isDisabled}
        disabledMessage={disabledMessage}
    />;
}

export default function ElectionSettings() {
    const { election, updateElection, enqueueWrite } = useElection()
    const min_rankings = 3;
    const max_rankings = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const default_rankings = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;

    const {t} = useSubstitutedTranslation(election.settings.term_type, {min_rankings, max_rankings});

    const { makeRequest: makePublicResultsRequest } = useSetPublicResults(election.election_id)

    const [publicResults, setPublicResults] = useOptimisticToggle(
        election.settings.public_results ?? false,
        async (v) => {
            const res = await enqueueWrite(expected_update_date =>
                makePublicResultsRequest({ public_results: v, expected_update_date })
            );
            return !!res && res.election?.settings?.public_results === v;
        }
    );

    const rankLimitInRange = (n: number) => n >= min_rankings && n <= max_rankings;

    return <>
        <Grid item xs={12} sx={{ m: 0, my: 0, p: 1 }}>
            <FormControl disabled={election.state !== 'draft'} component="fieldset" variant="standard" sx={{width: '100%'}}>
                <FormGroup>
                    <DialogTextField
                        label={t('election_settings.contact_email')}
                        value={election.settings.contact_email ?? ''}
                        disabled={election.state !== 'draft'}
                        onCommit={async (v) => updateElection(e => e.settings.contact_email = v)}
                        ariaLabel='Contact Email'
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
                        onToggle={async (v) => !! await updateElection(e => e.settings.max_rankings = v ? default_rankings : undefined)}
                    />

                    {election.settings.max_rankings !== undefined && (
                        <Box sx={{ pl: 4 }}>
                            <DialogTextField
                                label='Rank Limit'
                                value={String(election.settings.max_rankings)}
                                disabled={election.state !== 'draft'}
                                type='number'
                                ariaLabel='Rank Limit'
                                validate={(s) => {
                                    const n = Number(s);
                                    if (!Number.isInteger(n)) return 'Must be a whole number';
                                    if (!rankLimitInRange(n)) return `Must be between ${min_rankings} and ${max_rankings}`;
                                    return null;
                                }}
                                inputProps={{ min: min_rankings, max: max_rankings }}
                                onCommit={async (v) => updateElection(e => e.settings.max_rankings = Number(v))}
                            />
                        </Box>
                    )}
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
