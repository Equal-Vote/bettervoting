import { useEffect } from "react"
import Grid from "@mui/material/Grid";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Box, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { useParams } from "react-router";
import { useGetBallotByVoterId } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import ShareButton from "../ShareButton";
import { useSubstitutedTranslation } from "../../util";


const VerifyBallot = () => {
    const { election } = useElection()
    const { voter_id } = useParams();
    const { t } = useSubstitutedTranslation(election.settings.term_type);

    const { data, isPending, makeRequest: fetchBallot } = useGetBallotByVoterId(election.election_id, voter_id)
    console.log(`voterId: ${voter_id} electionId: ${election.election_id}`);
    useEffect(() => {
        if (election.election_id && voter_id ) {
            fetchBallot();
        }
    }, [election, voter_id])

    return (
        <Container>
            {isPending && <div> Loading Data... </div>}
            {data?.ballot &&
                <>
                <Box display='flex' flexDirection='column' alignItems='center' sx={{maxWidth: '800px', margin: 'auto'}}>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' } }} >
                        {['draft', 'open', 'closed'].includes(election.state) && election.settings.public_results === true &&
                            <Box sx={{ width: '100%',  p: 1, px:{xs: 5, sm: 1} }}>
                                <SecondaryButton
                                    type='button'
                                    fullWidth
                                    href={`/${election.election_id}/results`} >
                                    {t('ballot_submitted.results')}
                                </SecondaryButton>
                            </Box>
                        }
                        {election.settings.voter_access !== 'closed' &&
                            <Box sx={{ width: '100%', p: 1, px:{xs: 5, sm: 1}  }}>
                                <ShareButton url={`${window.location.origin}/${election.election_id}`}/>
                            </Box>
                        }
                    </Box>

                    <a href='https://www.equal.vote/donate'>{t('ballot_submitted.donate')}</a>
                </Box>

                <Divider sx={{my: 4}}/>

                <Grid container direction="column" >
                    {data?.ballot.precinct &&
                        <Grid item sm={12}>
                            <Typography align='left' variant="h6" component="h6">
                                {`Precinct: ${data?.ballot.precinct}`}
                            </Typography>
                        </Grid>
                    }
                    <Grid item sm={12}>
                        <Typography align='left' variant="h6" component="h6">
                            {`Status: ${data?.ballot.status}`}
                        </Typography>
                    </Grid>
                    {data?.ballot.votes.map((vote, v) => (
                        <>

                            <Typography align='left' variant="h6" component="h6">
                                {election.races[v].title}
                            </Typography>


                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableCell> Candidate </TableCell>
                                        <TableCell> Score </TableCell>
                                    </TableHead>
                                    <TableBody>
                                        {vote.scores.map((score, s) => (
                                            <TableRow key={s} >
                                                <TableCell component="th" scope="row">
                                                    <Typography variant="h6" component="h6">
                                                        {election.races.find(r => r.race_id == vote.race_id).candidates[s].candidate_name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell >
                                                    {score.score}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                        }

                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    ))}
                    { election.state === 'open' && election.settings.ballot_updates && data.ballot &&
                        <Grid item sm={4} >
                            <Box sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  size: "grow",
                                  minHeight: "10vh",
                                }}
                            >
                                <PrimaryButton
                                    type='button'
                                    sx={{ marginLeft: {xs: '10px', md: '40px'}}}
                                    href={`/${election.election_id}/vote`} >
                                    {t('ballot_submitted.edit')}
                                </PrimaryButton>
                            </Box>
                        </Grid>
                    }
                </Grid>
            </>}
        </Container>
    )
}

export default VerifyBallot; 
