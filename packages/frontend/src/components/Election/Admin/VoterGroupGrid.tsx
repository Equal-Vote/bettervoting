import { useEffect, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent,
    DialogTitle, FormHelperText, IconButton, Stack, Table, TableBody,
    TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import useElection from '~/components/ElectionContextProvider';
import { useGetRolls } from '~/hooks/useAPI';
import { useSubstitutedTranslation } from '~/components/util';
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';

const NO_GROUP = '';
const warn = 'brand.warningColumn';

function sees(precincts: string[] | undefined, group: string): boolean {
    return precincts === undefined || precincts.includes(group);
}

// ---------- Edit Groups Dialog ----------

type EditGroupsDialogProps = {
    open: boolean;
    onClose: () => void;
    groups: string[];
    counts: Record<string, number>;
    onAdd: (name: string) => string | null;
    onDelete: (name: string) => void;
    t: (key: string, opts?: object) => string;
};

function EditGroupsDialog({ open, onClose, groups, counts, onAdd, onDelete, t }: EditGroupsDialogProps) {
    const [newName, setNewName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAdd = () => {
        const err = onAdd(newName);
        setError(err);
        if (!err) setNewName('');
    };

    const handleClose = () => {
        setNewName('');
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{t('voter_group_grid.dialog_title')}</DialogTitle>
            <DialogContent>
                {groups.map(g => {
                    const inUse = (counts[g] ?? 0) > 0;
                    return (
                        <Box key={g}>
                            <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, minWidth: 260 }}>
                                <Box>
                                    <Typography>{g}</Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                        {t('voter_group_grid.voter_count', { count: counts[g] ?? 0 })}
                                    </Typography>
                                </Box>
                                <IconButton
                                    aria-label={`Delete ${g}`}
                                    disabled={inUse}
                                    onClick={() => onDelete(g)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Stack>
                            {inUse && (
                                <FormHelperText sx={{ mt: 0, mb: 1, fontStyle: 'italic', textAlign: 'right' }}>
                                    {t('voter_group_grid.error_has_voters')}
                                </FormHelperText>
                            )}
                        </Box>
                    );
                })}
                <Stack direction='row' sx={{ gap: 1, alignItems: 'flex-start', mt: 2 }}>
                    <TextField
                        size='small'
                        placeholder={t('voter_group_grid.new_group_placeholder')}
                        value={newName}
                        error={!!error}
                        helperText={error ?? ''}
                        onChange={e => { setNewName(e.target.value); setError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                        sx={{ width: 220 }}
                    />
                    <Button variant='outlined' onClick={handleAdd}>
                        {t('voter_group_grid.add_button')}
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{t('voter_group_grid.dialog_done')}</Button>
            </DialogActions>
        </Dialog>
    );
}

// ---------- Main Grid ----------

export default function VoterGroupGrid() {
    const { election, updateElection } = useElection();
    const { t } = useSubstitutedTranslation(election.settings.term_type);
    const { data, error: rollError, makeRequest } = useGetRolls(election.election_id);
    const [editOpen, setEditOpen] = useState(false);

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

    const addGroup = (raw: string): string | null => {
        const name = raw.trim();
        if (!name) return t('voter_group_grid.error_empty_name');
        if (groups.some(g => g.toLowerCase() === name.toLowerCase()))
            return t('voter_group_grid.error_duplicate_name');

        updateElection(e => {
            const newGroups = [...(e.settings.voter_groups ?? []), name];
            e.settings.voter_groups = newGroups;
            // Tick the new group on every race that has an explicit list
            e.races = e.races.map(r =>
                r.precincts ? { ...r, precincts: [...r.precincts, name] } : r
            );
        });
        return null;
    };

    const deleteGroup = (g: string) => {
        updateElection(e => {
            e.settings.voter_groups = (e.settings.voter_groups ?? []).filter(x => x !== g);
            e.races = e.races.map(r =>
                r.precincts ? { ...r, precincts: r.precincts.filter(x => x !== g) } : r
            );
        });
    };

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
        return (
            <Box sx={{ mt: 1 }}>
                <Button
                    size='small'
                    variant='outlined'
                    startIcon={<EditIcon />}
                    disabled={election.state !== 'draft'}
                    onClick={() => setEditOpen(true)}
                >
                    {t('voter_group_grid.add_groups')}
                </Button>
                <EditGroupsDialog
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    groups={groups}
                    counts={counts}
                    onAdd={addGroup}
                    onDelete={deleteGroup}
                    t={t}
                />
            </Box>
        );
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
                                    <Button
                                        size='small'
                                        variant='outlined'
                                        startIcon={<EditIcon />}
                                        disabled={election.state !== 'draft'}
                                        onClick={() => setEditOpen(true)}
                                    >
                                        {groups.length ? t('voter_group_grid.edit_groups') : t('voter_group_grid.add_groups')}
                                    </Button>
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
            <EditGroupsDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                groups={groups}
                counts={counts}
                onAdd={addGroup}
                onDelete={deleteGroup}
                t={t}
            />
        </Box>
    );
}
