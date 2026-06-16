import { useState, KeyboardEvent } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

/**
 * Click-to-edit field: displays a value with an edit affordance, opens a
 * modal on click to capture a new value, and commits on Save (or Enter).
 *
 * Replaces live-typed TextFields in admin flows so we don't have to
 * debounce-then-PUT on every keystroke (which races the write gate's
 * expected_update_date plumbing).
 */

export interface DialogTextFieldProps {
    label: string;
    value: string;
    onCommit: (newValue: string) => Promise<unknown>;
    disabled?: boolean;
    type?: 'text' | 'number';
    placeholder?: string;
    inputProps?: Record<string, unknown>;
    validate?: (value: string) => string | null;
    /** Shown (as an actionable cue) when the value is empty. */
    emptyDisplay?: string;
    ariaLabel?: string;
}

export default function DialogTextField({
    label,
    value,
    onCommit,
    disabled,
    type = 'text',
    placeholder,
    inputProps,
    validate,
    emptyDisplay = 'Click to add',
    ariaLabel,
}: DialogTextFieldProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleOpen = () => {
        if (disabled) return;
        setDraft(value);
        setError(null);
        setOpen(true);
    };

    const handleClose = () => {
        if (saving) return;
        setOpen(false);
    };

    const handleSave = async () => {
        const err = validate?.(draft) ?? null;
        if (err) {
            setError(err);
            return;
        }
        setSaving(true);
        try {
            await onCommit(draft);
        } finally {
            setSaving(false);
            setOpen(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    // Open the editor when the whole row is activated via keyboard (Enter/Space).
    const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
        }
    };

    const isEmpty = value === '' || value === undefined || value === null;
    const display = isEmpty ? emptyDisplay : String(value);

    return <>
        <Box
            onClick={handleOpen}
            onKeyDown={handleRowKeyDown}
            role={disabled ? undefined : 'button'}
            tabIndex={disabled ? undefined : 0}
            aria-label={disabled ? undefined : `Edit ${label}`}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                py: 1,
                px: 1,
                mx: -1,
                borderRadius: 1,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'background-color 0.15s',
                '&:hover': disabled ? undefined : { backgroundColor: 'action.hover' },
                '&:focus-visible': disabled
                    ? undefined
                    : { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '2px' },
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography component='div' sx={{ fontWeight: 500 }}>{label}</Typography>
                <Typography
                    component='div'
                    sx={{
                        wordBreak: 'break-word',
                        ...(isEmpty ? { color: 'primary.main', fontStyle: 'italic' } : {}),
                    }}
                >
                    {display}
                </Typography>
            </Box>
            {!disabled && (
                <IconButton
                    onClick={(e) => { e.stopPropagation(); handleOpen(); }}
                    aria-label={`Edit ${label}`}
                    size='small'
                    color='primary'
                >
                    <EditIcon fontSize='small' />
                </IconButton>
            )}
        </Box>
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm' aria-label={label}>
            <DialogTitle>{label}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    value={draft}
                    type={type}
                    placeholder={placeholder}
                    onChange={(e) => { setDraft(e.target.value); setError(null); }}
                    onKeyDown={handleKeyDown}
                    error={!!error}
                    helperText={error ?? ' '}
                    slotProps={{ htmlInput: { 'aria-label': ariaLabel ?? label, ...inputProps } }}
                    variant='standard'
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} variant='contained' disabled={saving}>Save</Button>
            </DialogActions>
        </Dialog>
    </>;
}
