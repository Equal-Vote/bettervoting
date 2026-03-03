import { useState } from 'react'
import { Paper, Stack, Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { Box, InputLabel } from "@mui/material";
import levenshtein from 'fast-levenshtein';
import { DragHandle, SortableList } from './DragAndDrop';


type group = {
    id: number,
    groupName: string,
    names: string[]
}

type SimilarityFn = (a: string, b: string) => number;

type MatchingMethods = 'levenshtein' | 'dice' | 'hybrid'

const groupStrictClusters = (items: string[], similarityFn: SimilarityFn, threshold: number): string[][] => {
    // Basic clustering function, clusters items such all items in cluster are within threshold of similarity function of each other
    // Not optimal clustering, so the first cluster an item can join it will

    const clusters: string[][] = [];
    const visited = new Set<string>();

    for (const item of items) {
        if (visited.has(item)) continue;

        const newCluster = [item];
        const toCheck = [item];
        visited.add(item);

        while (toCheck.length > 0) {
            toCheck.pop();
            for (const other of items) {
                if (!visited.has(other) && newCluster.every(member => similarityFn(member, other) >= threshold)) {
                    newCluster.push(other);
                    toCheck.push(other);
                    visited.add(other);
                }
            }
        }

        clusters.push(newCluster);
    }

    return clusters;
}

const levenshteinScore = (string1: string, string2: string) => {
    const distance = levenshtein.get(string1.toLowerCase(), string2.toLowerCase());
    const maxLength = Math.max(string1.length, string2.length);
    const similarity = 1 - distance / maxLength;
    return similarity
}


// Function to extract tokens and initials from a name
const extractTokens = (name: string): { words: string[]; initials: string[]; initialized: boolean } => {
    const tokens = name
        .replace(/\./g, "")
        .replace(/[^a-zA-Z\s.]/g, "") // Remove non-letters except spaces and periods
        .split(/\s+/); // Split by spaces

    const words: string[] = [];
    const initials: string[] = [];

    let initialized = false
    if (tokens.length === 1) {
        words.push(tokens[0]);
        initials.push(tokens[0])
    } else {
        words.push(...tokens)
        initials.push(words.map(word => word.charAt(0)).join(''))
        initialized = true
    }

    return { words, initials, initialized };
}

// Levenshtein-based token comparison
const compareTokenSets = (set1: string[], set2: string[]): number => {
    if (set1.length === 0 || set2.length === 0) return 0;

    let totalScore = 0;
    let comparisons = 0;

    for (const token1 of set1) {
        let bestMatch = 0;
        for (const token2 of set2) {
            if (token1.toLowerCase() === token2.toLowerCase()) {
                bestMatch = 1.0; // Exact match
            } else {
                if (token1.length>1 && token2.length>1){
                    const distance = levenshtein.get(token1.toLowerCase(), token2.toLowerCase())
                    const maxLength = Math.max(token1.length, token2.length)
                    const similarity = 1 - distance / maxLength
                    bestMatch = Math.max(bestMatch, similarity)
                } else if (token1.charAt(0) === token2.charAt(0)) {
                    bestMatch = Math.max(bestMatch,0.5)
                }
            }
        }
        totalScore += bestMatch;
        comparisons++;
    }

    return totalScore / Math.max(comparisons, 1); // Normalize score
}

// Initial comparison 
const compareInitials = (initials1: string[], initials2: string[]): number => {
    let bestScore = 0;
    // Check if the sets of initials match
    for (const initial1 of initials1) {
        for (const initial2 of initials2) {
            const score = levenshteinScore(initial1, initial2)
            if (score > bestScore) {
                bestScore = score
            }
        }
    }

    return bestScore
}

// Hybrid string similarity function
// Uses levenshteinScore score and token matching
const computeHybridSimilarity = (name1: string, name2: string): number => {
    const tokens1 = extractTokens(name1);
    const tokens2 = extractTokens(name2);

    const wordScore = compareTokenSets(tokens1.words, tokens2.words);

    const bothInitialized = tokens1.initialized && tokens2.initialized;
    const initialScore = bothInitialized ? 0 : compareInitials(tokens1.initials, tokens2.initials);

    const bonus = wordScore > 0 && initialScore > 0 ? 0.1 : 0; // 10% bonus if both match
    return Math.max(wordScore, initialScore) + bonus;
}

const NameMatchingTester = () => {

    const [names, setNames] = useState('John Fitzgerald Kennedy\nJFK\nJ.F.K\nJohn Kennedy\nJohn F. Kennedy\nJohn F. Kennedy Jr.\nJack Franklin Knight\nRobert\nRobbert\nAbdw\nSilence  Dogood')
    const [existingCandidates, setExistingCandidates] = useState('{\n  "John Fitzgerald Kennedy Jr.": ["JFK", "ABDW"],\n  "Benjamin Franklin": ["Silence Dogood"]\n}')
    const [groups, setGroups] = useState<group[]>([])
    const [jsonError, setJsonError] = useState<string | null>(null)
    const [algorithmLog, setAlgorithmLog] = useState<string[]>([])
    const [method, setMethod] = useState<MatchingMethods>('hybrid')
    const [threshold, setThreshold] = useState(0.6)

    const groupNames = () => {
        const log: string[] = []

        // Parse existing candidates JSON
        let existingCandidatesMap: Record<string, string[]> = {}
        try {
            existingCandidatesMap = JSON.parse(existingCandidates)
            setJsonError(null)
            log.push(`✓ Parsed ${Object.keys(existingCandidatesMap).length} existing candidate(s)`)
        } catch (e) {
            setJsonError("Invalid JSON format")
            return
        }

        const similarityFn = method === 'hybrid' ? computeHybridSimilarity : levenshteinScore

        // Get all write-in names to process, preserving originals and creating normalized versions
        const rawWriteInNames = names.split('\n').filter(n => n.trim().length > 0)
        const writeInNames = rawWriteInNames.map(n => n.replace(/\s+/g, ' ').trim())
        const originalWriteInMap = new Map(writeInNames.map((normalized, i) => [normalized, rawWriteInNames[i]]))

        log.push(`✓ Found ${writeInNames.length} write-in name(s) to process`)
        log.push(`✓ Normalized whitespace in write-in names`)
        log.push('')
        log.push('=== PHASE 1: Matching write-ins to existing candidates ===')
        log.push('')

        const unmatched: string[] = []
        const newGroups: group[] = []

        // Track which write-ins have been matched
        const matchedWriteIns = new Set<string>()

        // First, match write-ins to existing candidates
        Object.entries(existingCandidatesMap).forEach(([officialName, aliases], idx) => {
            const matched: string[] = []
            log.push(`\nChecking candidate: "${officialName}"`)
            log.push(`  Known aliases: [${aliases.map(a => `"${a}"`).join(', ')}]`)

            writeInNames.forEach(writeIn => {
                const originalWriteIn = originalWriteInMap.get(writeIn) || writeIn

                // Check if this write-in matches the official name (by score) or is identical to an alias
                const officialScore = similarityFn(writeIn, officialName)

                // Check for exact alias match (case-insensitive)
                const normalizedWriteIn = writeIn.toLowerCase()
                const exactAliasMatch = aliases.some(alias =>
                    alias.toLowerCase().trim() === normalizedWriteIn
                )

                if (officialScore >= threshold && !matched.includes(writeIn)) {
                    matched.push(writeIn)
                    matchedWriteIns.add(writeIn)
                    log.push(`  ✓ Matched "${originalWriteIn}" to official name (score: ${officialScore.toFixed(3)})`)
                } else if (exactAliasMatch && !matched.includes(writeIn)) {
                    matched.push(writeIn)
                    matchedWriteIns.add(writeIn)
                    const matchedAlias = aliases.find(a => a.toLowerCase().trim() === normalizedWriteIn)
                    log.push(`  ✓ Matched "${originalWriteIn}" to alias "${matchedAlias}" (*)`)
                }
            })

            if (matched.length === 0) {
                log.push(`  ✗ No write-ins matched`)
            }

            // Only include this candidate group if it has matches
            if (matched.length > 0) {
                // Don't duplicate: only add matched write-ins that aren't already in official name or aliases
                const uniqueMatches = matched.filter(m =>
                    m !== officialName && !aliases.includes(m)
                )
                newGroups.push({
                    id: idx,
                    groupName: officialName,
                    names: [officialName, ...aliases, ...uniqueMatches]
                })
            }
        })

        // Collect unmatched write-ins in one pass
        writeInNames.forEach(writeIn => {
            if (!matchedWriteIns.has(writeIn)) {
                unmatched.push(writeIn)
            }
        })

        log.push('')
        log.push('(*) Exact match after normalization (lowercase, whitespace trimmed)')
        log.push('')
        log.push(`=== PHASE 2: Clustering ${unmatched.length} unmatched write-in(s) ===`)
        log.push('')

        // Cluster the remaining unmatched names
        if (unmatched.length > 0) {
            log.push(`Unmatched names: [${unmatched.map(n => `"${n}"`).join(', ')}]`)
            const clusters = groupStrictClusters(unmatched, similarityFn, threshold)
            log.push(`✓ Created ${clusters.length} new cluster(s)`)

            clusters.forEach((cluster, idx) => {
                log.push(`\nCluster ${idx + 1}: "${cluster[0]}"`)
                cluster.forEach((name, i) => {
                    if (i === 0) {
                        log.push(`  • ${name} (group representative)`)
                    } else {
                        const score = similarityFn(cluster[0], name)
                        log.push(`  • ${name} (score: ${score.toFixed(3)})`)
                    }
                })

                newGroups.push({
                    id: Object.keys(existingCandidatesMap).length + idx,
                    groupName: cluster[0],
                    names: cluster
                })
            })
        } else {
            log.push('✓ All write-ins matched to existing candidates')
        }

        log.push('')
        log.push(`=== SUMMARY ===`)
        log.push('')
        log.push(`Total groups: ${newGroups.length}`)
        log.push(`Existing candidate groups: ${Object.keys(existingCandidatesMap).length}`)
        log.push(`New clusters: ${newGroups.length - Object.keys(existingCandidatesMap).length}`)

        setGroups(newGroups)
        setAlgorithmLog(log)
    }

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 2,
                flexDirection: 'column',
                backgroundColor: 'lightShade.main',
                padding: 3,
                maxWidth: 800
            }}
        >
            <InputLabel variant="standard" htmlFor="uncontrolled-native">
                Unprocessed Write-In Names
            </InputLabel>
            <TextField
                id="cvr"
                name="cvr"
                multiline
                rows="10"
                type="text"
                value={names}
                helperText="List of names to group, one name per line"
                onChange={(e) => setNames(e.target.value)}
            />

            <InputLabel variant="standard" htmlFor="existing-candidates">
                Official Candidates (with Known Aliases)
            </InputLabel>
            <TextField
                id="existing-candidates"
                name="existing-candidates"
                multiline
                rows="4"
                type="text"
                value={existingCandidates}
                helperText='JSON schema: { [officialCandidateName: string]: string[] }'
                onChange={(e) => setExistingCandidates(e.target.value)}
                error={!!jsonError}
            />
            {jsonError && (
                <Typography color="error" variant="caption">
                    {jsonError}
                </Typography>
            )}
            <FormControl fullWidth>
                <InputLabel variant="standard" htmlFor="uncontrolled-native">
                    Matching Method
                </InputLabel>
                <Select
                    name="Matching Method"
                    label="Matching Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as MatchingMethods)}
                >
                    <MenuItem key="levenshtein" value="levenshtein">
                        levenshtein
                    </MenuItem>

                    <MenuItem key="hybrid" value="hybrid">
                        hybrid
                    </MenuItem>

                </Select>
            </FormControl>

            <Typography gutterBottom component="p" sx={{ marginTop: 2 }}>
                Score Threshold
            </Typography>
            <TextField
                id={'levenshtein-threshold'}
                name="Levenshtein Threshold"
                type="number"
                InputProps={{
                    inputProps: {
                        min: 0,
                        max: 1,
                        step: 0.05
                    }
                }}
                fullWidth
                value={threshold}
                sx={{
                    p: 0,
                    boxShadow: 2,
                }}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
            />
            <Button variant='outlined' onClick={() => groupNames()} > Group Names </Button>

            {groups.length > 0 && (
                <>
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h5" sx={{ mb: 2 }}>
                            Grouped Results
                        </Typography>
                        <Stack spacing={2}>
                            {groups.map((group, idx) => (
                                <Paper key={idx} elevation={2} sx={{ p: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        {group.groupName}
                                    </Typography>
                                    <Box sx={{ pl: 2 }}>
                                        {group.names.map((name, i) => (
                                            <Typography
                                                key={i}
                                                variant="body2"
                                                sx={{
                                                    fontStyle: name === group.groupName ? 'italic' : 'normal',
                                                    color: name === group.groupName ? 'primary.main' : 'text.primary'
                                                }}
                                            >
                                                • {name}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>

                    {algorithmLog.length > 0 && (
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="h5" sx={{ mb: 2 }}>
                                Algorithm Process Log
                            </Typography>
                            <Paper elevation={2} sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Box
                                    component="pre"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        whiteSpace: 'pre-wrap',
                                        margin: 0,
                                        color: 'text.primary'
                                    }}
                                >
                                    {algorithmLog.join('\n')}
                                </Box>
                            </Paper>
                        </Box>
                    )}
                </>
            )}
        </Box>
    )
}
export default NameMatchingTester

