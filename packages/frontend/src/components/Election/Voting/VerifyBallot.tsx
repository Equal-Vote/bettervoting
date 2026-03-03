import { useEffect } from "react"
import Grid from "@mui/material/Grid";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Box, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { useParams } from "react-router";
import { useGetBallot } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import { SecondaryButton } from "~/components/styles";
import ShareButton from "../ShareButton";
import { useSubstitutedTranslation } from "../../util";


const VerifyBallot = () => {
    const { election } = useElection()
    const { ballot_id } = useParams();
    const { t } = useSubstitutedTranslation(election.settings.term_type);

    const { data, isPending, makeRequest: fetchBallot } = useGetBallot(election.election_id, ballot_id);
    useEffect(() => {
        if (ballot_id) {
            fetchBallot();
        }
    }, [ballot_id]);
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
                    <Grid item sm={12}>
                            <Typography component="div" align='left' variant="body1">
                                    <Box sx={{fontWeight: 'bold', m: 1, display: 'inline'}}>{t('ballot_submitted.ballot_id')}</Box>
                                    <Box sx={{fontWeight: 'regular', m: 1, display: 'inline'}}>{`${data.ballot.ballot_id}`}</Box>
                            </Typography>
                            {data.ballot.precinct &&
                                <Typography component="div" align='left' variant="body1">
                                    <Box sx={{fontWeight: 'bold', m: 1, display: 'inline'}}>{t('ballot_submitted.precinct')}</Box>
                                    <Box sx={{fontWeight: 'regular', m: 1, display: 'inline'}}>{`${data.ballot.precinct}`}</Box>
                                </Typography>
                            }
                            <Typography component="div" align='left' variant="body1">
                                <Box sx={{fontWeight: 'bold', m: 1, display: 'inline'}}>{t('ballot_submitted.status')}</Box>
                                <Box sx={{fontWeight: 'regular', m: 1, display: 'inline', textTransform: 'capitalize'}}>{`${data.ballot.status}`}</Box>
                            </Typography >
                            <Typography component="div" align="left" variant="body1" >
                                <Box sx={{fontWeight: 'bold', m: 1, display: 'inline'}}>{t('ballot_submitted.update_ballot')}</Box>
                                <Box sx={{fontWeight: 'regular', m: 1, display: 'inline'}}>
                                    {t(`ballot_submitted.update_ballot_${election.settings.ballot_updates ? election.state == 'open' ? 'enabled_open' : 'enabled_closed' : 'disabled'}`)}
                                </Box>
                            </Typography >
                    </Grid>
                    <Divider sx={{my: 4}}/>
                    {data.ballot.votes.map((vote, v) => (
                        <>

                            <Typography key={`title_${v}`} align='left' variant="h6" component="h6">
                                {election.races[v].title}
                            </Typography>


                            <TableContainer key={`container_${v}`} component={Paper}>
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
                </Grid>
            </>}
        </Container>
    )
}

export default VerifyBallot;
