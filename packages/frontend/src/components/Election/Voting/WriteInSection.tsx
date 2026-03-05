import React, { useContext, useState } from 'react';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { BallotContext } from './VotePage';

const MAX_WRITE_INS = 5;

export default function WriteInSection() {
    const ballotContext = useContext(BallotContext);
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');

    if (!ballotContext.race.enable_write_in) return null;

    const writeInCandidates = ballotContext.candidates.filter(
        c => c.candidate_id.startsWith('write_in_')
    );

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setError('Name cannot be empty');
            return;
        }

        const normalizedNew = trimmed.toLowerCase();

        // Check against all candidates (official + write-in)
        const isDuplicate = ballotContext.candidates.some(
            c => c.candidate_name.trim().toLowerCase() === normalizedNew
        );
        if (isDuplicate) {
            setError('This candidate already exists');
            return;
        }

        if (writeInCandidates.length >= MAX_WRITE_INS) {
            setError(`Maximum of ${MAX_WRITE_INS} write-in candidates`);
            return;
        }

        setError('');
        setInputValue('');
        ballotContext.addWriteIn(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Write-in Candidates
            </Typography>

            {writeInCandidates.map(c => (
                <Box key={c.candidate_id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ flex: 1 }}>{c.candidate_name}</Typography>
                    <IconButton
                        size="small"
                        onClick={() => ballotContext.removeWriteIn(c.candidate_name)}
                        aria-label={`Remove ${c.candidate_name}`}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            ))}

            {writeInCandidates.length < MAX_WRITE_INS && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'flex-start' }}>
                    <TextField
                        size="small"
                        label="Write-in candidate name"
                        value={inputValue}
                        onChange={e => { setInputValue(e.target.value); setError(''); }}
                        onKeyDown={handleKeyDown}
                        error={!!error}
                        helperText={error}
                        sx={{ flex: 1 }}
                    />
                    <Button variant="outlined" onClick={handleAdd} sx={{ mt: '4px' }}>
                        Add
                    </Button>
                </Box>
            )}
        </Box>
    );
}
