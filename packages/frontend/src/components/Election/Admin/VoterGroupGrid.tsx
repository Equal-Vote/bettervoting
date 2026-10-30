import { useEffect } from 'react';
import {
    Alert, Box, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import useElection from '~/components/ElectionContextProvider';
import { useGetRolls } from '~/hooks/useAPI';
import { useSubstitutedTranslation } from '~/components/util';
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import VoterGroupsDialog from './VoterGroupsDialog';

const NO_GROUP = '';
const warn = 'brand.warningColumn';

function sees(precincts: string[] | undefined, group: string): boolean {
    return precincts === undefined || precincts.includes(group);
}

export default function VoterGroupGrid() {
    const { election, updateElection } = useElection();
    const { t } = useSubstitutedTranslation(election.settings.term_type);
    const { data, error: rollError, makeRequest } = useGetRolls(election.election_id);

    useEffect(() => { makeRequest(); }, []);

    const groups: string[] = election.settings.voter_groups ?? [];
    const races = election.races;

    // Build voter counts per group from the roll
    const counts: Record<string, number> = {};
    const roll: ElectionRoll[] = data?.electionRoll ?? [];
    if (data || rollError) {
        roll.forEach(r => {
            const g = r.precinct?.trim() ?? NO_GROUP;
            counts[g] = (counts[g] ?? 0) + 1;
        });
    }

    const showNoGroup = (counts[NO_GROUP] ?? 0) > 0;

    // Visible columns: named groups + No group column when applicable
    const visibleCols: string[] = [...groups, ...(showNoGroup ? [NO_GROUP] : [])];

    // Compute warnings.
    // A column is empty only when it has voters (no warning for 0-voter groups).
    const emptyCols = visibleCols.filter(g =>
        (counts[g] ?? 0) > 0 && races.every(r => !sees(r.precincts, g))
    );
    const emptyRows = races.filter(r =>
        r.precincts !== undefined && visibleCols.every(g => !r.precincts!.includes(g))
    );

    // --- actions ---

    const saveGroups = async (newGroups: string[]) => {
        const added = newGroups.filter(g => !groups.includes(g));
        await updateElection(e => {
            e.settings.voter_groups = newGroups;
            // Drop deleted groups from every race, and tick added groups on every
            // race that has an explicit list so they see the same races as everyone else.
            e.races = e.races.map(r =>
                r.precincts
                    ? { ...r, precincts: [...r.precincts.filter(x => x === NO_GROUP || newGroups.includes(x)), ...added] }
                    : r
            );
        });
    };

    const groupsDialog = (
        <VoterGroupsDialog
            voterGroups={groups}
            disabled={election.state !== 'draft'}
            electionId={election.election_id}
            onSave={saveGroups}
        />
    );

    const setCell = (raceId: string, g: string, on: boolean) => {
        updateElection(e => {
            e.races = e.races.map(r => {
                if (r.race_id !== raceId) return r;
                // undefined means "open to all" — materialise the full list before editing.
                // Always include NO_GROUP ("") so hidden No-group ticks survive being re-shown.
                const current: string[] = r.precincts ?? [...(e.settings.voter_groups ?? []), NO_GROUP];
                const next = on ? [...current, g] : current.filter(x => x !== g);
                return { ...r, precincts: next };
            });
        });
    };

    if (groups.length === 0 && !showNoGroup) {
        return groupsDialog;
    }

    return (
        <Box sx={{ mt: 1 }}>
            <Box sx={{ width: 'fit-content', maxWidth: '100%' }}>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                    {t('voter_group_grid.instruction')}
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size='small' sx={{ '& td, & th': { px: 1 } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ verticalAlign: 'bottom' }}>
                                    {groupsDialog}
                                </TableCell>
                                {visibleCols.map(g => (
                                    <TableCell
                                        key={g}
                                        align='center'
                                        sx={{ bgcolor: emptyCols.includes(g) ? warn : undefined }}
                                    >
                                        <Box sx={{ fontWeight: 600, fontStyle: g === NO_GROUP ? 'italic' : undefined }}>
                                            {g === NO_GROUP ? t('voter_group_grid.no_group') : g}
                                        </Box>
                                        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                                            {t('voter_group_grid.voter_count', { count: counts[g] ?? 0 })}
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {races.map(r => {
                                const rowWarn = emptyRows.includes(r);
                                return (
                                    <TableRow
                                        key={r.race_id}
                                        sx={{ bgcolor: rowWarn ? warn : undefined }}
                                        aria-label={rowWarn ? `Warning: no group can see ${r.title}` : undefined}
                                    >
                                        <TableCell>{r.title}</TableCell>
                                        {visibleCols.map(g => (
                                            <TableCell
                                                key={g}
                                                align='center'
                                                sx={{ bgcolor: emptyCols.includes(g) ? warn : undefined }}
                                            >
                                                <Checkbox
                                                    checked={sees(r.precincts, g)}
                                                    disabled={election.state !== 'draft'}
                                                    onChange={e => setCell(r.race_id, g, e.target.checked)}
                                                    slotProps={{ input: { 'aria-label': `${r.title} / ${g === NO_GROUP ? t('voter_group_grid.no_group') : g}` } }}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
                {emptyRows.map(r => (
                    <Alert key={r.race_id} severity='warning' sx={{ mt: 1, width: 0, minWidth: '100%', boxSizing: 'border-box' }}>
                        {t('voter_group_grid.warning_empty_row', { title: r.title })}
                    </Alert>
                ))}
                {emptyCols.map(g => (
                    <Alert key={g} severity='warning' sx={{ mt: 1, width: 0, minWidth: '100%', boxSizing: 'border-box' }}>
                        {g === NO_GROUP
                            ? t('voter_group_grid.warning_empty_col_no_group')
                            : t('voter_group_grid.warning_empty_col_named', { group: g })}
                    </Alert>
                ))}
            </Box>
        </Box>
    );
}
