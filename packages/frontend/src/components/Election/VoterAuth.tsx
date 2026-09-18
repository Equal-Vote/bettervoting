import { useEffect, useState } from "react"
import { useParams } from "react-router";
import Typography from '@mui/material/Typography';
import TextField from "@mui/material/TextField";
import Box from '@mui/material/Box';
import { FormHelperText } from "@mui/material"
import { useCookie } from "../../hooks/useCookie";
import useAuthSession from "../AuthSessionContextProvider";
import useElection from "../ElectionContextProvider";
import { PrimaryButton, SecondaryButton } from "../styles";
import { useRequestVoterId } from "~/hooks/useAPI";
import { getVoterAuthenticationMode } from "@equal-vote/star-vote-shared/domain_model/VoterAuthenticationMode";

const VoterAuth = () => {
  const authSession = useAuthSession()
  const { election, voterAuth, refreshElection } = useElection()
  const { voter_id } = useParams();
  // TODO: maybe we should reconsider useCookie here? this has the potential of inserting the voter id on a different election
  // Cookies don't support special charaters so we b64 everything we store in there
  // https://help.vtex.com/en/tutorial/why-dont-cookies-support-special-characters--6hs7MQzTri6Yg2kQoSICoQ
  const [base64VoterID, setBase64VoterID] = useCookie('voter_id', voter_id ? btoa(voter_id) : null, 1)
  const [lookupEmail, setLookupEmail] = useState('')
  const { isPending: lookupPending, makeRequest: requestVoterId } = useRequestVoterId(election?.election_id)

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
  // "Email me my voter ID" exists only where the server issued the ids from an email list.
  let bvManagedIds = false
  try { bvManagedIds = getVoterAuthenticationMode(election.settings) === 'closed_bv_managed_ids' } catch { bvManagedIds = false }
  const submitLookup = async () => {
    if (!lookupEmail.trim() || lookupPending) return
    if (await requestVoterId({ email: lookupEmail.trim() })) setLookupEmail('')
  }
  const emailRequired = election.settings?.voter_authentication?.email

  const isAuthorized = voterAuth?.authorized_voter
  const missingEmail = voterAuth?.required === "Email Validation Required"
  const missingVoterID = voterAuth?.required === "Voter ID Required"

  return (
    <Box sx={{ p: 1, flexGrow: 1 }}>
      {isOpen &&
        <>
          {!isAuthorized && !missingEmail && emailRequired &&
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Typography align='center' variant="h5" component="h5">
                You are not authorized to vote in this election
              </Typography>
            </Box>
          }
          {!isAuthorized && missingEmail && emailRequired &&
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Typography align='center' gutterBottom variant="h5" component="h5">
                You must <a onClick={authSession.openLogin} style={{ cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}>log in </a> to access this election
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
              {bvManagedIds &&
                <Box sx={{ display: 'flex', flexDirection: 'column', pt: 2 }}>
                  <Typography sx={{ pl: 1 }}>
                    Don't have your voter ID? Enter the email address you were invited with and we'll send it to you.
                  </Typography>
                  <Box sx={{ display: 'flex' }}>
                    <Box sx={{ p: 1, flexGrow: 1 }}>
                      <TextField
                        id="voter-id-lookup-email"
                        label="Email"
                        type="email"
                        fullWidth
                        value={lookupEmail}
                        onChange={(e) => setLookupEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submitLookup() }}
                      />
                    </Box>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                      <SecondaryButton disabled={lookupPending || !lookupEmail.trim()} onClick={submitLookup}>Email me my ID</SecondaryButton>
                    </Box>
                  </Box>
                </Box>
              }
            </>
          }
        </>
      }
    </Box>
  )
}

export default VoterAuth
