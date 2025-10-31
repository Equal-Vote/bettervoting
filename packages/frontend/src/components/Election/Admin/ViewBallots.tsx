import { useEffect } from "react"
import Container from '@mui/material/Container';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useGetBallots } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import DraftWarning from "../DraftWarning";
import { BallotDataExport } from "../Results/BallotDataExport";

const ViewBallots = () => {
    // some ballots will have different subsets of the races, but we need the full list anyway
    // so we use election instead of precinctFilteredElection
    const { election } = useElection()
    const { data, isPending, makeRequest: fetchBallots } = useGetBallots(election.election_id)

    const flags = useFeatureFlags();
    useEffect(() => { fetchBallots() }, [])


    return (
        <Container>
            <DraftWarning />
            <Typography align='center' gutterBottom variant="h4" component="h4">
                {election.title}
            </Typography>
            <Typography align='center' gutterBottom variant="h5" component="h5">
                View Ballots
            </Typography>
            {isPending && <div> Loading Data... </div>}
            {data?.ballots &&
                <>
                    <TableContainer component={Paper}>
                        <Table style={{ width: '100%' }} aria-label="simple table">
                            <TableHead>
                                <TableRow >
                                    <TableCell colSpan={3}></TableCell>
                                    {election.races.map(race => (
                                        <TableCell key={race.race_id} align='center' sx={{borderWidth: 1, borderTopWidth: 0, borderColor: 'lightgray', borderStyle: 'solid'}}  colSpan={race.candidates.length}>
                                            {race.title}
                                        </TableCell>
                                    ))}
                                </TableRow>

                            </TableHead>
                            <TableHead>
                                <TableCell> Ballot ID </TableCell>
                                {flags.isSet('VOTER_FLAGGING') &&
                                    <TableCell> Precinct </TableCell>
                                }
                                <TableCell> Status </TableCell>
                                {election.races.map((race) => (
                                    race.candidates.map((candidate) => (
                                        <TableCell key={candidate.candidate_id} >
                                            {candidate.candidate_name}
                                        </TableCell>
                                    ))
                                ))}
                            </TableHead>
                            <TableBody>
                                {data.ballots.map((ballot) => (
                                    <TableRow key={ballot.ballot_id} >
                                        <TableCell component="th" scope="row">{ballot.ballot_id}</TableCell>
                                        {flags.isSet('VOTER_FLAGGING') &&
                                            <TableCell >{ballot.precinct || ''}</TableCell>
                                        }
                                        <TableCell >{ballot.status.toString()}</TableCell>
                                        {ballot.votes.map((vote) => (
                                            vote.scores.map((score) => (
                                                <TableCell key={score.candidate_id}>{score.score || ''}</TableCell>
                                            ))))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <BallotDataExport election={election}/>
                </>
            }
        </Container>
    )
}

export default ViewBallots
