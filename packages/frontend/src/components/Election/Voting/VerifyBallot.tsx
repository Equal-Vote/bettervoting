import { Fragment, useEffect } from "react"
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
import { isWriteInCandidate, writeInCandidateName } from "@equal-vote/star-vote-shared/utils/makeID";
import useFeatureFlags from "../../FeatureFlagContextProvider";



const VerifyBallot = () => {
    const { election, permissions: userPermissions } = useElection()
    const { ballot_id } = useParams();
    const { t } = useSubstitutedTranslation(election.settings.term_type);
    const flags = useFeatureFlags();

    // Mirrors the server: only election staff may view a ballot by id.
    const canView = userPermissions?.includes('canViewBallots');

    const { data, isPending, makeRequest: fetchBallot } = useGetBallot(election.election_id, ballot_id);
    useEffect(() => {
        if (ballot_id && canView) {
            fetchBallot();
        }
    }, [ballot_id, canView]);
    return (
        <Container>
            {!canView && <Typography align='center' sx={{ my: 4 }}>{t('ballot_submitted.lookup_staff_only')}</Typography>}
            {isPending && <div> Loading Data... </div>}
            {data?.ballot &&
                <>
                <Box sx={{ maxWidth: '800px', margin: 'auto', display: "flex", flexDirection: "column", alignItems: "center" }}>
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
                <Grid container sx={{ flexDirection: 'column' }} >
                    <Grid size={{ sm: 12 }}>
                            <Typography component="div" align='left' variant="body1">
                                    <Box sx={{fontWeight: 'bold', m: 1, display: 'inline'}}>{t('ballot_submitted.ballot_id')}</Box>
                                    <Box sx={{fontWeight: 'regular', m: 1, display: 'inline'}}>{`${data.ballot.ballot_id}`}</Box>
                            </Typography>
                            {flags.isSet('PRECINCTS') && data.ballot.precinct &&
                                <Typography component="div" align='left' variant="body1">
                                    <Box sx={{fontWeight: 'bold', m: 1, display: 'inline'}}>{t('ballot_submitted.voter_group')}</Box>
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
                    {data.ballot.votes.map((vote, v) => {
                        const race = election.races.find(r => r.race_id == vote.race_id);
                        return (
                        <Fragment key={vote.race_id}>

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
                                                        {race?.candidates.find(c => c.candidate_id === score.candidate_id)?.candidate_name
                                                            ?? score.write_in_name
                                                            ?? (isWriteInCandidate(score.candidate_id) ? writeInCandidateName(score.candidate_id) : score.candidate_id)}
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
                        </Fragment>
                        )
                    })}
                </Grid>
            </>}
        </Container>
    )
}

export default VerifyBallot;
