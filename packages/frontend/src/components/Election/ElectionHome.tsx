import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Paper } from "@mui/material";
import ShareButton from "./ShareButton";
import VoterAuth from "./VoterAuth";
import { useSubstitutedTranslation } from '../util';
import useElection from '../ElectionContextProvider';
import DraftWarning from "./DraftWarning";
import SupportBlurb from './SupportBlurb';
import { PrimaryButton, SecondaryButton } from '../styles';

const ElectionHome = () => {
  const { election, voterAuth } = useElection();

  const {t} = useSubstitutedTranslation(election.settings.term_type, {time_zone: election.settings.time_zone});

  const canUpdateBallot = (voterAuth.has_voted == true && election.settings.ballot_updates);

  return (
    <>
      <DraftWarning/>
      {election && voterAuth &&
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            maxWidth: 600,
            minHeight: 400,
            minWidth: {xs: 0, md: '500px'},
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            margin: 'auto'
          }}
        >
          {/* Only show share button if election voter access is not closed  */}
          {election.settings.voter_access !== 'closed' &&
            <Box sx={{ m: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ maxWidth: 200 }}>
                <ShareButton url={`${window.location.origin}/${election.election_id}`} />
              </Box>
            </Box>
          }
          <Box sx={{ flexGrow: 0 }}>
            <Typography align='center' gutterBottom variant="h3" component="h3" fontWeight={'bold'}>
              {election.title}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <Typography align='center' component="p" style={{ whiteSpace: 'pre-line' }}>
              {election.description}
            </Typography>
          </Box>

          <VoterAuth />

          {election.state === 'finalized' && election.start_time &&
            <Box sx={{ flexGrow: 1 }}>
              <Typography align='center' variant="h6" component="h6">
                {t('election_home.start_time',{datetime: election.start_time})}
              </Typography>
            </Box>
          }

          {election.state === 'open' && <>
            {election.end_time &&
              <Box sx={{ flexGrow: 1 }}>
                < Typography align='center' variant="h6" component="h6">
                  {t('election_home.end_time',{datetime: election.end_time})}
                </Typography>
              </Box>}
            {
              (voterAuth.has_voted == false || canUpdateBallot) && voterAuth.authorized_voter && !voterAuth.required &&

              <Box display='flex' flexDirection='column' alignItems='center' gap={5} sx={{ p: 1}}>
                <PrimaryButton fullWidth href={`/${String(election?.election_id)}/vote`} name='vote' >
                  <Typography align='center' variant="h3" component="h3" fontWeight='bold' sx={{ p: 2 }}>
                    {/*display edit ballot or vote text conditionally*/}
                    {voterAuth.has_voted ? t('editable_ballots.edit_vote') : t('election_home.vote')}
                  </Typography>
                </PrimaryButton>
                {election.settings.public_results === true &&
                <SecondaryButton href={`/${String(election?.election_id)}/results`} sx={{mx: 'auto', width: '90%', p:3}}>
                    {t('election_home.or_view_results')}
                </SecondaryButton>
                }
              </Box>
              }
            </>}
          {election.state === 'draft' && <>
            <Box display='flex' flexDirection='column' alignItems='center' gap={3} sx={{ p: 1}}>
              <PrimaryButton fullWidth href={`/${String(election?.election_id)}/vote`} name='vote' >
                <Typography align='center' variant="h3" component="h3" fontWeight='bold' sx={{ p: 2 }}>
                  {t('election_home.vote')}
                </Typography>
              </PrimaryButton >
              {election.settings.public_results === true &&
              <SecondaryButton href={`/${String(election?.election_id)}/results`} sx={{mx: 'auto', width: '90%', p:3}}>
                  {t('election_home.or_view_results')}
              </SecondaryButton >
              }
            </Box>
          </>}

          {election.state === 'closed' && election.end_time &&
            <Box sx={{ flexGrow: 1 }}>
              <Typography align='center' variant="h6" component="h6">
                  {t('election_home.ended_time',{
                      datetime: election.end_time
                  })}
              </Typography>
            </Box>
          }
          {voterAuth.has_voted == true && !canUpdateBallot &&
            <Box display='flex' flexDirection='column' alignItems='center' gap={5} sx={{ p: 1}}>
              <Typography align='center' variant="h6" component="h6">
                {t('election_home.ballot_submitted')}
              </Typography>
            </Box>
          }
          {/* Show results button only if public_results enabled and voter has voted or election is closed */}
          {(election.settings.public_results === true &&
            (election.state === 'open' && voterAuth.has_voted && !canUpdateBallot) || election.state === 'closed') &&
            <SecondaryButton href={`/${String(election?.election_id)}/results`} sx={{mx: 'auto', width: '90%', p:3}}>
              {t('election_home.view_results')}
            </SecondaryButton>
          }
          {election.state === 'archived' &&
            <Box sx={{ flexGrow: 1 }}>
              <Typography align='center' variant="h6" component="h6">
                {t('election_home.archived')}
              </Typography>
            </Box>
          }
        </Paper>
      }
      <SupportBlurb/>
    </>
  )
}

export default ElectionHome
