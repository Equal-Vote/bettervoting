import { useEffect, useState } from 'react'
import Results from './Election/Results/Results';
import { FormHelperText, Grid, Paper } from "@mui/material";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { InputLabel } from "@mui/material";
import { useGetSandboxResults } from '../hooks/useAPI';
import { VotingMethod } from '@equal-vote/star-vote-shared/domain_model/Race';
import { ElectionContextProvider } from './ElectionContextProvider';
import { PrimaryButton } from './styles';

// The tabulators bound each method's marks — Star.ts and AllocatedScore.ts to
// 0-5, Approval.ts and Plurality.ts to 0-1 — and a ballot outside those bounds
// is silently dropped from the count (filterInitialVotes, counted only as
// nOutOfBoundsVotes). The sandbox has to say so, or the page just shows a
// smaller election than the one that was typed in.
//
// Ranked methods are deliberately absent: their marks are rankings, bounded by
// max_rankings rather than by 5, and the sandbox sets no election settings, so
// any positive rank is legitimate there.
// null means "not a score at all" — a ranking, bounded by max_rankings rather
// than by a number, and the sandbox sets no election settings, so any positive
// rank is legitimate. Spelled as a full Record rather than a Partial so that
// adding a method to the menu without deciding its range is a type error, not
// a silent fall-through to no validation.
const MAX_SCORE_BY_METHOD: Record<VotingMethod, number | null> = {
    STAR: 5,
    STAR_PR: 5,
    Approval: 1,
    Plurality: 1,
    RankedRobin: null,
    IRV: null,
    STV: null,
}

const Sandbox = () => {

    const { data, error, makeRequest } = useGetSandboxResults()

    const [candidates, setCandidates] = useState('A,B,C,D,E')
    const [cvr, setCvr] = useState('10:2,1,3,4,5\n10:5,4,3,1,2\n3,2,5,4,1')
    const [nWinners, setNWinners] = useState(1)
    const [votingMethod, setVotingMethod] = useState<VotingMethod>('STAR')
    const [errorText, setErrorText] = useState('')

    const getResults = async () => {
        const cvrRows = cvr.split("\n")
        const cvrSplit = [];
        const parsedCandidates = candidates.split(",").filter(d => (d !== ' ' && d !== ''))
        const nCandidates = parsedCandidates.length

        if (nCandidates < nWinners) {
            setErrorText('Cannot have more winners than candidates')
            return
        }
        const maxScore = MAX_SCORE_BY_METHOD[votingMethod]

        // The first complaint is the one that gets shown: a later row must not
        // overwrite it, or a trailing newline reports "wrong length" for a
        // ballot whose real problem is the score above it.
        let firstError = ''
        const fail = (message: string) => { if (firstError === '') firstError = message }

        const checkScores = (marks: string[]) => {
            for (const mark of marks) {
                const score = Number(mark)
                // parseInt would quietly turn 2.5 into 2 and send a ballot the
                // user never typed, so the raw text is what gets judged.
                if (!Number.isInteger(score)) {
                    fail(`You are using incorrect score ${mark}. Scores must be whole numbers.`)
                    return false
                }
                if (score < 0 || (maxScore !== null && score > maxScore)) {
                    fail(maxScore === null
                        ? `You are using incorrect score ${score}. Rankings cannot be negative.`
                        : `You are using incorrect score ${score}. Use scores between 0 and ${maxScore}.`)
                    return false
                }
            }
            return true
        }

        let valid = true
        cvrRows.forEach((row) => {
            if (row.trim() === '') return // a trailing newline is not a ballot
            const data = row.split(':')
            const marks = (data.length == 2 ? data[1] : data[0]).split(/[\s,]+/).filter(d => d !== ' ' && d !== '')
            // Number, not parseInt, and the same conversion the validation uses:
            // parseInt('1e2') is 1 where Number is 100, so the two disagreeing
            // is how a validated mark becomes a different submitted mark.
            const vote = marks.map(Number)

            if (vote.length !== nCandidates) {
                fail('Each ballot must have the same length as the number of candidates')
                valid = false
                return
            }
            if (!checkScores(marks)) {
                valid = false
                return
            }

            if (data.length == 2) {
                const nBallots = Number(data[0]);
                // Array(NaN) and Array(-1) both throw, and the throw escapes an
                // async effect with no handler, leaving the last error on screen.
                if (!Number.isInteger(nBallots) || nBallots < 1) {
                    fail(`'${data[0]}' is not a number of ballots. Use a whole number before the colon.`)
                    valid = false
                    return
                }
                cvrSplit.push(...Array(nBallots).fill(vote))
            } else {
                cvrSplit.push(vote)
            }
        })
        if (!valid) {
            setErrorText(firstError)
            return
        }
        setErrorText('')
        await makeRequest({
            cvr: cvrSplit,
            candidates: candidates.split(","),
            num_winners: nWinners,
            votingMethod: votingMethod,
        })
    }

    useEffect(() => {
        getResults()
    }, [nWinners, cvr, votingMethod, candidates])

    return (
        //Using grid to force results into the center and fill screen on smaller screens.
        //Using theme settings and css can probably replace the grids
        <ElectionContextProvider id={undefined}>
        <Grid container spacing={0} sx={{ p: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
                <Grid container spacing={0} sx={{ p: 3 }}>
                    <Grid size={12}>
                        <FormControl fullWidth>
                            <InputLabel variant="standard" htmlFor="uncontrolled-native">
                                Voting Method
                            </InputLabel>
                            <Select
                                name="Voting Method"
                                label="Voting Method"
                                value={votingMethod}
                                onChange={(e) => setVotingMethod(e.target.value as VotingMethod)}
                            >
                                <MenuItem key="STAR" value="STAR">
                                    STAR
                                </MenuItem>
                                <MenuItem key="STAR_PR" value="STAR_PR">
                                    STAR-PR
                                </MenuItem>
                                <MenuItem key="RankedRobin" value="RankedRobin">
                                    Ranked Robin
                                </MenuItem>
                                <MenuItem key="Approval" value="Approval">
                                    Approval
                                </MenuItem>
                                <MenuItem key="Plurality" value="Plurality">
                                    Plurality
                                </MenuItem>
                                <MenuItem key="IRV" value="IRV">
                                    Ranked Choice Voting (IRV)
                                </MenuItem>
                                <MenuItem key="STV" value="STV">
                                    Single Transferable Vote (STV)
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={12}>

                        <InputLabel variant="standard" htmlFor="uncontrolled-native">
                            Number of Winners
                        </InputLabel>
                        <TextField
                            id="num-winners"
                            name="Number Of Winners"
                            type="number"
                            value={nWinners}
                            onChange={(e) => setNWinners(parseInt(e.target.value))}
                        />
                    </Grid>
                    <Grid size={12}>
                        <InputLabel variant="standard" htmlFor="uncontrolled-native">
                            Candidates
                        </InputLabel>
                        <TextField
                            id="candidates"
                            name="candidates"
                            multiline
                            type="text"
                            value={candidates}
                            helperText="Comma seperated list of candidates"
                            onChange={(e) => setCandidates(e.target.value)}
                        />
                    </Grid>
                    <Grid size={12}>
                        <InputLabel variant="standard" htmlFor="uncontrolled-native">
                            Votes
                        </InputLabel>
                        <TextField
                            id="cvr"
                            name="cvr"
                            multiline
                            rows="5"
                            type="text"
                            value={cvr}
                            helperText="Comma seperated scores, one ballot per line, optional 'x:' in front of ballot to indicate x number of that ballot"
                            onChange={(e) => setCvr(e.target.value)}
                        />
                        <FormHelperText error>
                            {errorText}
                        </FormHelperText>
                    </Grid>
                    <PrimaryButton onClick={() => getResults()} > Get Results </PrimaryButton>
                    </Grid>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={3} sx={{width: '100%', maxWidth: '1200px', m: {xs: 0, m: 2}, p: {xs: 1, m: 2}, backgroundColor:'brand.white', marginBottom: 2, '@media print': { boxShadow: 'none'}}}>
                        
                    {data && !error && (
                        <Results
                            results={data.results}
                            race={{
                                race_id: '',
                                title: '',
                                candidates: data.candidates.map((candidate, index) => { return { candidate_id: index.toString(), candidate_name: candidate } }),
                                voting_method: data.results.votingMethod,
                                num_winners: data.nWinners,
                            }}
                        />)}
                </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
            </Grid>
        </Grid>
        </ElectionContextProvider>
    )
}
export default Sandbox