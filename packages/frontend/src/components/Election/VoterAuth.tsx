import { useEffect } from "react"
import { useParams } from "react-router";
import Typography from '@mui/material/Typography';
import TextField from "@mui/material/TextField";
import Box from '@mui/material/Box';
import { Alert, AlertTitle, FormHelperText, Link } from "@mui/material"
import { useCookie } from "../../hooks/useCookie";
import useAuthSession from "../AuthSessionContextProvider";
import useElection from "../ElectionContextProvider";
import { PrimaryButton } from "../styles";

const VoterAuth = () => {
  const authSession = useAuthSession()
  const { election, voterAuth, refreshElection, t } = useElection()
  const { voter_id } = useParams();
  // TODO: maybe we should reconsider useCookie here? this has the potential of inserting the voter id on a different election
  // Cookies don't support special charaters so we b64 everything we store in there
  // https://help.vtex.com/en/tutorial/why-dont-cookies-support-special-characters--6hs7MQzTri6Yg2kQoSICoQ
  const [base64VoterID, setBase64VoterID] = useCookie('voter_id', voter_id ? btoa(voter_id) : null, 1)

  const setVoterID = (v: string) => setBase64VoterID(v ? btoa(v) : v);
  const voterID = () => base64VoterID ? atob(base64VoterID) : base64VoterID;

  useEffect(() => {
    setVoterID(voter_id)
    submitVoterID()
  }, [voter_id])

  const submitVoterID = () => {
    refreshElection()
  }

  const clearVoterID = () => {
    setVoterID(null)
    refreshElection()
  }

  if (!election) return <></>

  const isOpen = election.state === "open"

  const voterIdRequired = election.settings?.voter_authentication?.voter_id && election.settings.voter_access === 'closed'
  const emailRequired = election.settings?.voter_authentication?.email

  const isAuthorized = voterAuth?.authorized_voter
  const missingEmail = voterAuth?.required === "Email Validation Required"
  // Signed in, but the account's email address was never verified (must match the backend's
  // EMAIL_VERIFICATION_REQUIRED in voterRollUtils.ts).
  const unverifiedEmail = voterAuth?.required === "Email Verification Required"
  const missingVoterID = voterAuth?.required === "Voter ID Required"

  return (
    <Box sx={{ p: 1, flexGrow: 1 }}>
      {isOpen &&
        <>
          {!isAuthorized && unverifiedEmail && emailRequired &&
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Alert severity="warning" sx={{ maxWidth: '600px' }}>
                <AlertTitle>{t('verified_email.vote_title')}</AlertTitle>
                {t('verified_email.vote_description')}{' '}
                <Link component="button" type="button" onClick={authSession.openLogout} sx={{ font: 'inherit', verticalAlign: 'baseline' }}>{t('verified_email.log_out')}</Link>
                {' · '}
                <Link href={authSession.accountUrl} target="_blank" rel="noreferrer">{t('verified_email.account_settings')}</Link>
              </Alert>
            </Box>
          }
          {!isAuthorized && !missingEmail && !unverifiedEmail && emailRequired &&
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Typography align='center' variant="h5" component="h5">
                You are not authorized to vote in this election
              </Typography>
            </Box>
          }
          {!isAuthorized && missingEmail && emailRequired &&
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Typography align='center' gutterBottom variant="h5" component="h5">
                You must <Link component="button" type="button" onClick={authSession.openLogin} sx={{ font: 'inherit', color: 'inherit', textDecorationColor: 'inherit', verticalAlign: 'baseline' }}>log in</Link> to access this election
              </Typography>
            </Box>
          }
          {voterIdRequired && voter_id !== undefined && isAuthorized &&
            <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h5" component="h5">
                Your unique voter id:
              </Typography>
              <p>
                {/*The below expression displays the uuid as b1d0cac0-****-****-****-************ */}
                {voter_id.split('-').map((str, i) => (i==0)? str : str.replace(/./g, "●")).join('-')}
              </p>
            </Box>
          }
          {voterIdRequired && (voter_id === undefined || !isAuthorized) &&
            <>
              <Box sx={{ display: 'flex' }}>
                <Box sx={{ p: 1, flexGrow: 1 }}>
                  <TextField
                    id="voter-id"
                    label="Voter ID"
                    value={voterID() ? voterID() : ''}
                    type="password"
                    fullWidth
                    onChange={(e) => {
                      setVoterID(e.target.value)
                    }}
                    error={(!missingVoterID && !isAuthorized)}
                  />
                </Box>

                {(!isAuthorized || missingVoterID) &&
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                    <PrimaryButton onClick={() => submitVoterID()} > Submit </PrimaryButton>
                  </Box>
                }
                {isAuthorized && voterID() &&
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                    <PrimaryButton onClick={() => clearVoterID()} > Clear </PrimaryButton>
                  </Box>
                }
              </Box>
              <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                {(!missingVoterID && !isAuthorized) ? "Invalid Voter ID" : ''}
              </FormHelperText>
            </>
          }
        </>
      }
    </Box>
  )
}

export default VoterAuth
