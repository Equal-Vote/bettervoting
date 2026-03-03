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
        let valid = true
        cvrRows.forEach((row) => {
            const data = row.split(':')
            if (data.length == 2) {
                const nBallots = parseInt(data[0]);
                const vote = data[1].split(/[\s,]+/).filter(d => d !== ' ').map((score) => parseInt(score)).filter(d => !isNaN(d))
                if (vote.length !== nCandidates) {
                    setErrorText('Each ballot must have the same length as the number of candidates')
                    valid = false
                }
                cvrSplit.push(...Array(nBallots).fill(vote))
            } else {
                const vote = data[0].split(/[\s,]+/).filter(d => d !== ' ').map((score) => parseInt(score)).filter(d => !isNaN(d))
                if (vote.length !== nCandidates) {
                    setErrorText('Each ballot must have the same length as the number of candidates')
                    valid = false
                }
                cvrSplit.push(vote)
            }
        })
        if (!valid) return
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
            <Grid item xs={12} md={6}>
                <Grid container spacing={0} sx={{ p: 3 }}>
                    <Grid item xs={12}>
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
                    <Grid item xs={12}>

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
                    <Grid item xs={12}>
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
                    <Grid item xs={12}>
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
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} sm={2}>
            </Grid>
        </Grid>
        </ElectionContextProvider>
    )
}
export default Sandbox