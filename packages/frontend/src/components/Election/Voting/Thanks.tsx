import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ShareButton from "../ShareButton";
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { PrimaryButton, SecondaryButton } from "../../styles";
import useElection from '../../ElectionContextProvider';
import { useSubstitutedTranslation } from '~/components/util';
import DraftWarning from '../DraftWarning';

const Thanks = () => {
    
    const { election, voterAuth } = useElection()
    const {t} = useSubstitutedTranslation(election.settings.term_type)
    return <>
        <DraftWarning/>
        {election &&
            <Box
                display="flex"
                flexDirection='column'
                justifyContent="center"
                alignItems="center"
                maxWidth={600}
                mx='auto'
                mb='100px'>
                <Typography align='center' variant="h3" component="h3">
                    {t('ballot_submitted.title')}
                </Typography>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <HowToVoteIcon sx={{ fontSize: 40 }} />
                </div>
                <Typography align='center' variant="h5" component="h5" sx={{ p: 2 }}>
                    {t('ballot_submitted.description')}
                </Typography>

                {election.state === 'open' && election.end_time &&
                    < Typography align='center' variant="h6" component="h6" sx={{ pb: 3 }}>
                        {t('ballot_submitted.end_time',{
                            date: new Date(election.end_time).toLocaleDateString(),
                            time: new Date(election.end_time).toLocaleTimeString()
                        })}
                    </Typography>
                }

                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'column' } }} >
                    {['draft', 'open', 'closed'].includes(election.state) && election.settings.public_results === true &&
                        <Box sx={{ width: '100%',  p: 1, px:{xs: 5, sm: 1} }}>
                            <PrimaryButton
                                type='button'
                                fullWidth
                                href={`/${election.election_id}/results`} >
                                {t('ballot_submitted.results')}
                            </PrimaryButton>
                        </Box>
                    }
                    {election.state == 'open' && election.settings.ballot_updates &&
                        <Box sx={{ width: '100%',  p: 1, px:{xs: 5, sm: 1} }}>
                            <SecondaryButton
                                type='button'
                                fullWidth
                                href={ (voterAuth?.authorized_voter ? `/${String(election?.election_id)}/vote` : `/${String(election?.election_id)}`)} >
                                {t('editable_ballots.edit_vote')}
                            </SecondaryButton>
                        </Box>
                    }
                    {election.settings.voter_access !== 'closed' &&
                        <Box sx={{ width: '100%', p: 1, px:{xs: 5, sm: 1}  }}>
                            <ShareButton url={`${window.location.origin}/${election.election_id}`}/>
                        </Box>
                    }
                </Box>
                <Box sx={{ margin: 'auto', p: 1, px:{xs: 5, sm: 1} }}>
                    <a href='https://www.equal.vote/donate'>{t('ballot_submitted.donate')}</a>
                </Box>
            </Box>
        }
    </>
}

export default Thanks
