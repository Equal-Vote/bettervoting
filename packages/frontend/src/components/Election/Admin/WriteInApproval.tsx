import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Checkbox, TextField
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import { PrimaryButton } from '../../styles';
import useElection from '../../ElectionContextProvider';
import { useGetWriteIns, useSetWriteInResults } from '../../../hooks/useAPI';
import { WriteInCandidate } from '@equal-vote/star-vote-shared/domain_model/WriteIn';

const trimLower = (s: string) => s.trim().toLowerCase();

interface CandidateRow {
    officialName: string;
    approved: boolean;
    aliases: string[];
    count: number;
}

const WriteInApproval = () => {
    const { raceId } = useParams<{ raceId: string }>();
    const { election, refreshElection } = useElection();
    const { data: writeInData, makeRequest: fetchWriteIns } = useGetWriteIns(election.election_id);
    const { makeRequest: setWriteInResults, isPending } = useSetWriteInResults(election.election_id);
    const [rows, setRows] = useState<CandidateRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    const race = useMemo(() => election.races.find(r => r.race_id === raceId), [election, raceId]);

    useEffect(() => {
        fetchWriteIns();
    }, []);

    useEffect(() => {
        if (!race || !writeInData) return;
        buildRows();
    }, [race, writeInData]);

    const buildRows = () => {
        const existing = race.write_in_candidates || [];
        const raceWriteInData = writeInData.write_in_data.find(d => d.race_id === raceId);
        const ballotNames = raceWriteInData?.names || {};

        // Build merged view keyed by trimLower
        const rowMap = new Map<string, CandidateRow>();

        // Start with existing candidates
        for (const ex of existing) {
            const key = trimLower(ex.candidate_name);
            rowMap.set(key, {
                officialName: ex.candidate_name,
                approved: ex.approved,
                aliases: [...(ex.aliases || [])],
                count: 0,
            });
            // Also index aliases
            for (const alias of (ex.aliases || [])) {
                const ak = trimLower(alias);
                if (!rowMap.has(ak)) {
                    rowMap.set(ak, rowMap.get(key)!);
                }
            }
        }

        // Merge ballot data
        for (const [name, count] of Object.entries(ballotNames)) {
            const key = trimLower(name);
            const existing = rowMap.get(key);
            if (existing) {
                existing.count += count;
                // Add as alias if different casing from official name
                if (name.trim() !== existing.officialName && !existing.aliases.some(a => trimLower(a) === key)) {
                    existing.aliases.push(name.trim());
                }
            } else {
                const newRow: CandidateRow = {
                    officialName: name.trim(),
                    approved: false,
                    aliases: [],
                    count: count,
                };
                rowMap.set(key, newRow);
            }
        }

        // Deduplicate: collect unique rows by object identity
        const seen = new Set<CandidateRow>();
        const result: CandidateRow[] = [];
        for (const row of rowMap.values()) {
            if (!seen.has(row)) {
                seen.add(row);
                result.push(row);
            }
        }

        // Sort: approved first, then by count descending
        result.sort((a, b) => {
            if (a.approved !== b.approved) return a.approved ? -1 : 1;
            return b.count - a.count;
        });

        setRows(result);
        setError(null);
    };

    const handleApprovedChange = (index: number, checked: boolean) => {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, approved: checked } : r));
    };

    const handleNameChange = (index: number, name: string) => {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, officialName: name } : r));
    };

    const handleUpdate = async () => {
        // Client-side validation: no two official names may trimLower to same value
        const nameKeys = new Set<string>();
        for (const row of rows) {
            const key = trimLower(row.officialName);
            if (!key) {
                setError('Official name cannot be empty');
                return;
            }
            if (nameKeys.has(key)) {
                setError(`Duplicate official name: "${row.officialName}"`);
                return;
            }
            nameKeys.add(key);
        }
        setError(null);

        const candidates: WriteInCandidate[] = rows.map(r => ({
            candidate_name: r.officialName,
            approved: r.approved,
            aliases: r.aliases,
        }));

        const result = await setWriteInResults({
            write_in_results: {
                race_id: raceId!,
                write_in_candidates: candidates,
            }
        });

        if (result) {
            await refreshElection();
            await fetchWriteIns();
        }
    };

    if (!race) {
        return <Typography color="error">Race not found</Typography>;
    }

    return (
        <Box sx={{ maxWidth: 900, margin: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton component={Link} to={`/${election.election_id}/admin`}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" sx={{ ml: 1 }}>
                    Write-In Candidates for {race.title}
                </Typography>
            </Box>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Approved</TableCell>
                            <TableCell>Official Name</TableCell>
                            <TableCell>Aliases</TableCell>
                            <TableCell>Count</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Checkbox
                                        checked={row.approved}
                                        onChange={(e) => handleApprovedChange(index, e.target.checked)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        value={row.officialName}
                                        onChange={(e) => handleNameChange(index, e.target.value)}
                                        size="small"
                                        fullWidth
                                    />
                                </TableCell>
                                <TableCell>
                                    {row.aliases.join(', ')}
                                </TableCell>
                                <TableCell>{row.count}</TableCell>
                            </TableRow>
                        ))}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No write-in candidates found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <PrimaryButton onClick={handleUpdate} disabled={isPending}>
                    Update
                </PrimaryButton>
            </Box>
        </Box>
    );
};

export default WriteInApproval;
