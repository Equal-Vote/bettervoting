import { useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TextField, FormHelperText, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSubstitutedTranslation } from '~/components/util';
import useElection from '~/components/ElectionContextProvider';
import { useGetRolls } from '~/hooks/useAPI';

export default function VoterGroupsDialog({ voterGroups, onSave, disabled, electionId }: {
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
    const { election } = useElection();
    const { t } = useSubstitutedTranslation(election.settings.term_type);
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
