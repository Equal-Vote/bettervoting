import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { FormGroup, Radio, RadioGroup, Box, capitalize, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
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

    // Inclusive [min_rankings, max_rankings] — drives the rank-limit selector below.
    const rankOptions = Array.from({ length: max_rankings - min_rankings + 1 }, (_, i) => min_rankings + i);

    return <>
        <Grid size={12} sx={{ m: 0, my: 0, p: 1 }}>
            <FormControl disabled={election.state !== 'draft'} component="fieldset" variant="standard" sx={{width: '100%'}}>
                <FormGroup>
                    <DialogTextField
                        label={t('election_settings.contact_email')}
                        value={election.settings.contact_email ?? ''}
                        disabled={election.state !== 'draft'}
                        type='text'
                        placeholder='support@example.com'
                        emptyDisplay='Click to add a support email for voters'
                        onCommit={async (v) => updateElection(e => e.settings.contact_email = v)}
                        ariaLabel='Contact Email'
                    />

                    <Box sx={{mt: 2, mb: 2}}>
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
                    {/* max_rankings is set for every election (defaulting to default_rankings),
                        so this is always shown rather than gated behind a toggle. */}
                    <Box sx={{ pl: { xs: 0, sm: 4 }, py: 1 }}>
                        <Typography component='div' sx={{ fontWeight: 500, mb: 1 }}>
                            {t('tips.max_rankings.title')}
                            <Tip name='max_rankings' values={{ min_rankings, max_rankings }} />
                        </Typography>
                        <ToggleButtonGroup
                            value={election.settings.max_rankings ?? default_rankings}
                            exclusive
                            disabled={election.state !== 'draft'}
                            aria-label='Rank Limit'
                            // Ignore null: clicking the active button would otherwise deselect
                            // it. max_rankings must stay set, so we never let it become undefined.
                            onChange={(_, v: number | null) => {
                                if (v !== null) updateElection(e => e.settings.max_rankings = v);
                            }}
                            sx={{
                                flexWrap: 'wrap',
                                gap: 1,
                                // Detach the grouped border-radius/border-collapse so buttons
                                // render as standalone chips that wrap cleanly on mobile.
                                '& .MuiToggleButtonGroup-grouped': {
                                    m: 0,
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    borderRadius: 1,
                                    // Default ToggleButton text is text.secondary (gray) and
                                    // reads as disabled; use the accent color so it looks active.
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '&:hover': { backgroundColor: 'primary.dark' },
                                    },
                                },
                            }}
                        >
                            {rankOptions.map((n) => (
                                <ToggleButton
                                    key={n}
                                    value={n}
                                    aria-label={`${n} ranks`}
                                    // Snug single-digit chip; 44px tall keeps a mobile touch target.
                                    sx={{ minWidth: 40, minHeight: 44, px: 0, py: 0.5 }}
                                >
                                    {n}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
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
