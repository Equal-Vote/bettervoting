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

type SyncedSwitchSettingProps = Omit<SwitchSettingProps, 'onToggle'> & { onToggle: (newValue: boolean) => Promise<boolean> };

function SyncedSwitchSetting({ toggled, onToggle, ...rest }: SyncedSwitchSettingProps) {
    const [localToggled, setLocalToggled] = useSyncedState(toggled, onToggle);
    return <SwitchSetting toggled={localToggled} onToggle={setLocalToggled} {...rest} />;
}

type ElectionSwitchSettingProps = {
    settingKey: keyof IElectionSettings;
    disabled?: boolean;
    disabledMessage?: string;
    onToggle?: (newValue: boolean) => Promise<boolean>;
}

export default function ElectionSettings() {
    const { election, updateElection } = useElection()
    const min_rankings = 3;
    const max_rankings = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const default_rankings = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;

    const {t} = useSubstitutedTranslation(election.settings.term_type, {min_rankings, max_rankings});

    function ElectionSwitchSetting({ settingKey, disabled, disabledMessage, onToggle: onToggleOverride }: ElectionSwitchSettingProps) {
        const defaultOnToggle = async (v: boolean) => !! await updateElection(e => { (e.settings as unknown as Record<string, unknown>)[settingKey] = v; });

        return <SyncedSwitchSetting
            label={t(`election_settings.${settingKey}`)}
            toggled={!!election.settings[settingKey]}
            onToggle={onToggleOverride ?? defaultOnToggle}
            disabled={disabled}
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
                    <ElectionSwitchSetting
                        settingKey="ballot_updates"
                        disabled={election.settings.voter_access === 'open' || election.settings.invitation !== 'email' || !!election.settings.public_results}
                        disabledMessage={t(
                            election.settings.voter_access === 'open' || election.settings.invitation !== 'email'
                                ? 'disabled_msgs.ballot_updates_when_open'
                                : 'disabled_msgs.ballot_updates_with_prelim'
                        )}
                    />
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
                </FormGroup>
            </FormControl>
        </Grid>
        <AdminPageNavigation />
    </>
}
