import Grid from "@mui/material/Grid";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { FormGroup, Radio, RadioGroup, Box, capitalize, Typography, ToggleButton, ToggleButtonGroup, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TextField, FormHelperText } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { ElectionSettings as IElectionSettings, TermType } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { Tip } from '~/components/styles';
import { useSubstitutedTranslation, SwitchSetting } from '~/components/util';
import useElection from '~/components/ElectionContextProvider';
import useOptimisticToggle from "~/hooks/useOptimisticToggle";
import { AdminPageNavigation } from '../Sidebar';
import { useGetRolls, useSetPublicResults } from '~/hooks/useAPI';
import DialogTextField from '~/components/DialogTextField';
import useFeatureFlags from '~/components/FeatureFlagContextProvider';
import { useState } from 'react';
import VoterGroupGrid from './VoterGroupGrid';

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

function VoterGroupsDialog({ voterGroups, onSave, disabled, electionId }: {
    voterGroups: string[];
    onSave: (groups: string[]) => Promise<void>;
    disabled: boolean;
    electionId: string;
}) {
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState<string[]>(voterGroups);
    const [newName, setNewName] = useState('');
    const [addError, setAddError] = useState('');
    const [voterCounts, setVoterCounts] = useState<Record<string, number>>({});
    const { t } = useSubstitutedTranslation('election');
    const { makeRequest: fetchRolls } = useGetRolls(electionId);

    const handleOpen = async () => {
        setGroups(voterGroups);
        setNewName('');
        setAddError('');
        setOpen(true);
        const result = await fetchRolls();
        if (result) {
            const counts: Record<string, number> = {};
            for (const roll of result.electionRoll) {
                if (roll.precinct) {
                    counts[roll.precinct] = (counts[roll.precinct] ?? 0) + 1;
                }
            }
            setVoterCounts(counts);
        }
    };

    const handleAdd = () => {
        const trimmed = newName.trim();
        if (!trimmed) {
            setAddError(t('voter_groups_dialog.empty_name'));
            return;
        }
        if (groups.some(g => g.toLowerCase() === trimmed.toLowerCase())) {
            setAddError(t('voter_groups_dialog.duplicate_name'));
            return;
        }
        setGroups([...groups, trimmed]);
        setNewName('');
        setAddError('');
    };

    const handleDelete = (index: number) => {
        setGroups(groups.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        await onSave(groups);
        setOpen(false);
    };

    const hasGroups = voterGroups.length > 0;
    const buttonLabel = hasGroups ? t('voter_groups_dialog.edit_button') : t('voter_groups_dialog.add_button');

    return (
        <>
            <Button
                variant="outlined"
                size="small"
                startIcon={hasGroups ? <EditIcon /> : <AddIcon />}
                onClick={handleOpen}
                disabled={disabled}
                sx={{ mt: 1 }}
            >
                {buttonLabel}
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('voter_groups_dialog.title')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        {groups.map((group, i) => {
                            const count = voterCounts[group] ?? 0;
                            const deleteDisabled = count > 0;
                            return (
                                <Box key={i} sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography>
                                            {t('voter_groups_dialog.voter_count', { group, count })}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            aria-label={t('voter_groups_dialog.delete_tooltip')}
                                            onClick={() => handleDelete(i)}
                                            disabled={deleteDisabled}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    {deleteDisabled && (
                                        <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>
                                            {t('voter_groups_dialog.cant_delete')}
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <TextField
                                size="small"
                                placeholder={t('voter_groups_dialog.add_group_label')}
                                value={newName}
                                onChange={e => { setNewName(e.target.value); setAddError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                                error={!!addError}
                                sx={{ flexGrow: 1 }}
                            />
                            <Button variant="contained" size="small" onClick={handleAdd}>
                                <AddIcon />
                            </Button>
                        </Box>
                        {addError && <FormHelperText error>{addError}</FormHelperText>}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>{t('keyword.cancel')}</Button>
                    <Button variant="contained" onClick={handleSave}>{t('keyword.save')}</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default function ElectionSettings() {
    const { election, updateElection, enqueueWrite, refreshElection } = useElection()
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
            // updateElection updates the context as a side effect of building its
            // request body, but this write doesn't go through it, so the context
            // would keep the pre-write value until the next GET — leaving this page
            // and coming back would re-mount the switch showing the old setting.
            if (res) await refreshElection();
            return !!res && res.election?.settings?.public_results === v;
        }
    );

    // is_public is a top-level Election column, not an entry in Election.settings, so
    // this can't use ElectionSwitchSetting (which writes into election.settings).
    const [isPublic, setIsPublic] = useOptimisticToggle(
        !!election.is_public,
        async (v) => !!await updateElection(e => { e.is_public = v; })
    );

    // getOpenElections filters on settings.voter_access == 'open' in addition to
    // is_public, so on a voter-list election the flag would have no visible effect.
    const browsable = election.settings.voter_access === 'open';
    const flags = useFeatureFlags();

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
                    {flags.isSet('PRECINCTS') && (
                        <Box sx={{ py: 0.5 }}>
                            <ElectionSwitchSetting settingKey="voter_groups_enabled" label={t('election_settings.voter_groups')} />
                            {election.settings.voter_groups_enabled && (
                                <VoterGroupsDialog
                                    voterGroups={election.settings.voter_groups ?? []}
                                    disabled={election.state !== 'draft'}
                                    electionId={election.election_id}
                                    onSave={async (groups) => {
                                        await updateElection(e => { e.settings.voter_groups = groups; });
                                    }}
                                />
                            )}
                        </Box>
                    )}
                    {/* Note: this can't use ElectionSwitchSetting because we need to use the results from makePublicResultsRequest as the source of truth */}
                    <SwitchSetting
                        label={election.state === 'closed' || election.state === 'archived' ? t('election_settings.public_results') : t('election_settings.preliminary_results')}
                        toggled={publicResults}
                        onToggle={setPublicResults}
                    />
                    {/* Also can't use ElectionSwitchSetting — is_public lives on the
                        election, not on election.settings. */}
                    <SwitchSetting
                        label={t('election_settings.is_public')}
                        toggled={isPublic}
                        onToggle={setIsPublic}
                        disabled={election.state !== 'draft' || !browsable}
                        disabledMessage={browsable ? undefined : t('disabled_msgs.is_public_when_voter_list')}
                    />
                    {/* max_rankings is set for every election (defaulting to default_rankings),
                        so this is always shown rather than gated behind a toggle. Kept last so the
                        settings read as radios, then toggles, then the rank-limit selector. */}
                    <Box sx={{ py: 1 }}>
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
                                // Indent only the buttons (not the label above) so they read
                                // as nested under the heading.
                                ml: { xs: 0, sm: 4 },
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
                </FormGroup>
            </FormControl>
        </Grid>

        {flags.isSet('PRECINCTS') && election.settings.voter_groups_enabled && <VoterGroupGrid />}

        <AdminPageNavigation />
    </>
}
