import { createContext, useCallback, useState } from "react"
import BallotPageSelector from "./BallotPageSelector";
import { useParams } from "react-router";
import React from 'react'
import { useNavigate } from "react-router";
import { Box, Checkbox, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Step, StepLabel, Stepper, SvgIcon, TextField, Typography } from "@mui/material";
import { NewBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Vote } from "@equal-vote/star-vote-shared/domain_model/Vote";
import { Score } from "@equal-vote/star-vote-shared/domain_model/Score";
import { usePostBallot } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import useAuthSession from "../../AuthSessionContextProvider";
import { PrimaryButton, SecondaryButton } from "../../styles";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import { Candidate } from "@equal-vote/star-vote-shared/domain_model/Candidate";
import { Race, VotingMethod } from "@equal-vote/star-vote-shared/domain_model/Race";
import { useSubstitutedTranslation } from "~/components/util";
import DraftWarning from "../DraftWarning";
import SupportBlurb from "../SupportBlurb";
import ElectionStateWarning from "../ElectionStateWarning"

// I'm using the icon codes instead of an import because there was padding I couldn't get rid of
// https://stackoverflow.com/questions/65721218/remove-material-ui-icon-margin
// const INFO_ICON = "M 11 7 h 2 v 2 h -2 Z m 0 4 h 2 v 6 h -2 Z m 1 -9 C 6.48 2 2 6.48 2 12 s 4.48 10 10 10 s 10 -4.48 10 -10 S 17.52 2 12 2 Z m 0 18 c -4.41 0 -8 -3.59 -8 -8 s 3.59 -8 8 -8 s 8 3.59 8 8 s -3.59 8 -8 8 Z"
const CHECKED_BOX = "M 19 3 H 5 c -1.11 0 -2 0.9 -2 2 v 14 c 0 1.1 0.89 2 2 2 h 14 c 1.11 0 2 -0.9 2 -2 V 5 c 0 -1.1 -0.89 -2 -2 -2 Z m -9 14 l -5 -5 l 1.41 -1.41 L 10 14.17 l 7.59 -7.59 L 19 8 l -9 9 Z"
//const UNCHECKED_BOX = "M 19 5 v 14 H 5 V 5 h 14 m 0 -2 H 5 c -1.1 0 -2 0.9 -2 2 v 14 c 0 1.1 0.9 2 2 2 h 14 c 1.1 0 2 -0.9 2 -2 V 5 c 0 -1.1 -0.9 -2 -2 -2 Z"
const DOT_ICON = "M12 6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6m0-2c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"
const WARNING_ICON = "M12,5.99L19.53,19H4.47L12,5.99 M12,2L1,21h22L12,2L12,2z"
type receiptEmail = {
  sendReceipt: boolean,
  email: string
}

export interface BallotCandidate extends Candidate {
  score: number
}

export interface IBallotContext {
  instructionsRead: boolean,
  setInstructionsRead: () => void,
  candidates: BallotCandidate[],
  race: Race,
  onUpdate: (any) => void,
  receiptEmail: receiptEmail,
  setReceiptEmail: React.Dispatch<receiptEmail>
  maxRankings?: number,
  warningColumns?: number[],
  setWarningColumns?: (warningColumns: number[]) => void,
  alertBubbles?: [number, number][],
  setAlertBubbles?: (alertBubbles: [number, number][]) => void,
  warnings?: {severity: 'warning' | 'error', message: string}[],
  setWarnings?: (warnings: {severity: 'warning' | 'error', message: string}[]) => void,
}

export interface IPage {
  instructionsRead: boolean,
  candidates: BallotCandidate[],
  voting_method: VotingMethod,
  race_index: number,
  warningColumns?: number[],
  warnings?: {severity: 'warning' | 'error', message: string}[],
  alertBubbles?: [number, number][],
}


export const BallotContext = createContext<IBallotContext>(null);

function shuffle<T>(array: T[]): T[] {
  // From: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  // Suffles and array into a random order
  let currentIndex = array.length, randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

const VotePage = () => {
  const flags = useFeatureFlags();
  const { precinctFilteredElection: election } = useElection()
  const authSession = useAuthSession()
  const makePages = ():IPage[] => {
    // generate ballot pages
    const pages = election.races.map((race, raceIndex) => {
      const candidates = race.candidates.map(candidate => ({ ...candidate, score: null }))
      return {
        instructionsRead: (flags.isSet('FORCE_DISABLE_INSTRUCTION_CONFIRMATION') || !election.settings.require_instruction_confirmation)? true : false, // I could just do !require_... , but this is more clear
        candidates: (flags.isSet('FORCE_DISABLE_RANDOM_CANDIDATES') || !election.settings.random_candidate_order) ? candidates : shuffle(candidates),
        voting_method: race.voting_method,
        race_index: raceIndex,
        hasAlert: false
      }
    })
    return pages
  }

  const { id } = useParams();
  const [pages, setPages] = useState(makePages())
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0)
  const [receiptEmail, setReceiptEmail] = useState<receiptEmail>(authSession.isLoggedIn() ? { sendReceipt: true, email: authSession.getIdField('email') } : { sendReceipt: false, email: '' })
  const setInstructionsRead = () => {
    pages[currentPage].instructionsRead = true;
    // shallow copy to trigger a refresh
    setPages([...pages])
  }

  const setCurrentPageAndScroll = (a) => {
    setCurrentPage(a);
    // HACK: the scroll wasn't work if the button was disabled after press (like for pressing next to the last page)
    //       adding the setTimeout fixed it
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },1)
  }

  const setWarningColumns = (warningColumns: number[]) => {
    pages[currentPage].warningColumns = warningColumns;
    //shallow copy to trigger a refresh
    setPages([...pages])
  }
  const setWarnings = useCallback((warnings: {severity: 'warning' | 'error', message: string}[]) => {
    pages[currentPage].warnings = warnings;
    //shallow copy to trigger a refresh
    setPages([...pages])
  }, [pages, currentPage])
  const [isOpen, setIsOpen] = useState(false)

  const setAlertBubbles = useCallback((alertBubbles: [number, number][]) => {
    pages[currentPage].alertBubbles = alertBubbles;
    //shallow copy to trigger a refresh
    setPages([...pages])
  }, [pages, currentPage])

  const { isPending, makeRequest: postBallot } = usePostBallot(election.election_id)
  const onUpdate = (pageIndex, newRaceScores) => {
    setPages(prevPages => {
      const nextPages = [...prevPages];
      const prevPage = prevPages[pageIndex];
      const nextCandidates = prevPage.candidates.map((candidate, idx) => ({
        ...candidate,
        score: newRaceScores[idx]
      }));
      nextPages[pageIndex] = {
        ...prevPage,
        candidates: nextCandidates
      };
      return nextPages;
    });
  }
  const submit = async () => {
    const candidateScores = pages.map((p) => p.candidates)
    // create arrays of candidate IDs for each race. Ballots will be sorted into this order
    const candidateIDs = election.races.map(race => race.candidates.map(candidate => candidate.candidate_id))

    // takes voter's scores and resorts them back into the order in the election.race objects
    const votes: Vote[] =
      election.races.map((race, race_index) => (
        {
          race_id: race.race_id,
          scores: candidateScores[race_index].map(c => ({ candidate_id: c.candidate_id, score: c.score } as Score)).sort((a: Score, b: Score) => {
            return candidateIDs[race_index].indexOf(a.candidate_id) - candidateIDs[race_index].indexOf(b.candidate_id)
          })
        }))
    const ballot: NewBallot = {
      election_id: election.election_id,
      votes: votes,
      date_submitted: Date.now(),
      status: 'submitted',
    }
    // post ballot, if response ok navigate back to election home
    if (!(await postBallot({ 
      ballot: ballot, 
      receiptEmail: receiptEmail.sendReceipt ? receiptEmail.email : undefined }
      ))) {
      return
    }
    navigate(`/${id}/thanks`)
  }

  const {t} = useSubstitutedTranslation(election.settings.term_type)


  if(pages.length == 0){
    return <Container disableGutters={true} maxWidth="sm"><h3>No races created for election</h3></Container>
  }

  const ALL_EQUAL_IS_ABSTENTION_VOTING_METHODS = new Set(['STAR', 'STAR_PR']);
  const allEqualIsAbstention = (page) => {
    return ALL_EQUAL_IS_ABSTENTION_VOTING_METHODS.has(page.voting_method);
  }
  const pageIsUnderVote = (page) => {
    return page.candidates.every(c => c.score === (allEqualIsAbstention(page) ? page.candidates[0].score : null));
  }

  const isLastPage = (currentPage === pages.length-1)

  return (
    <Container disableGutters={true} maxWidth="sm">
      <DraftWarning/>
      <ElectionStateWarning
        state="archived"
        title="archived_warning.title"
        description="archived_warning.description"/>
      <BallotContext.Provider value={{
        instructionsRead: pages[currentPage].instructionsRead,
        setInstructionsRead: setInstructionsRead,
        candidates: pages[currentPage].candidates,
        race: election.races[currentPage],
        onUpdate: newRankings => onUpdate(currentPage, newRankings),
        receiptEmail: receiptEmail,
        setReceiptEmail: setReceiptEmail,
        maxRankings: election.settings.max_rankings,
        warningColumns: pages[currentPage].warningColumns,
        setWarningColumns: setWarningColumns,
        warnings: pages[currentPage].warnings,
        setWarnings: setWarnings,
        alertBubbles: pages[currentPage].alertBubbles,
        setAlertBubbles: setAlertBubbles,

      }}>
        <BallotPageSelector votingMethod={pages[currentPage].voting_method} />
      </BallotContext.Provider>
      <Box sx={{ display: 'flex', justifyContent: "space-between", marginTop: '10px' }}>
        <SecondaryButton
          onClick={() => setCurrentPageAndScroll(count => count - 1)}
          disabled={currentPage === 0}
          sx={{ visibility: (currentPage === 0) ? 'hidden' : 'visible' }}>
            {t('ballot.previous')}
        </SecondaryButton>
        {pages.length > 1 && 
          <Stepper className='racePageStepper' sx={{display: 'flex', flexWrap: 'wrap'}}>
            {pages.map((page, pageIndex) => (
              <Box key={pageIndex}>
                <Step
                  onClick={() => setCurrentPageAndScroll(pageIndex)}
                  style={{ fontSize: "16px", width: "auto", minWidth: "0px", marginTop: "10px", paddingLeft: "0px", paddingRight: "0px" }}
                >
                  <StepLabel>
                    {/*TODO: I can probably do this in css using the :selected property*/}
                    <SvgIcon 
                      sx={{ 
                        color: page.warnings ? 'brand.warning' : (pageIndex === currentPage) ? 'var(--brand-black)' : 'var(--ballot-race-icon-teal)' }}>
                      {page.warnings ? <path d={WARNING_ICON} /> : page.candidates.some((candidate) => (candidate.score > 0)) ? <path d={CHECKED_BOX} /> : <path d={DOT_ICON} />}
                      {page.warnings && <>
                      <polygon points="13,16 11,16 11,18 13,18"/>
                      <polygon points="13,10 11,10 11,15 13,15"/>
                      </>}
                    </SvgIcon>
                  </StepLabel>
                </Step>
              </Box>
            ))}
          </Stepper>
        }
        <PrimaryButton
          onClick={() => isLastPage? setIsOpen(true) : setCurrentPageAndScroll(count => count + 1)}
          sx={{ marginLeft: {xs: '10px', md: '40px'}}}
          disabled={isLastPage && (election.state === "archived")}
          >
            {t(isLastPage? 'ballot.submit_ballot' : 'ballot.next')}
        </PrimaryButton>
      </Box>
      <SupportBlurb/>

      {isPending && <div> {t('ballot.submitting')} </div>}
      <Dialog
        open={isOpen}
        fullWidth
      >
        <DialogTitle>{t('ballot.dialog_submit_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>

            <FormControlLabel control={
              <Checkbox
                id="send-ballot-receipt"
                name="Send Ballot Receipt Email"
                checked={receiptEmail.sendReceipt}
                onChange={(e) => setReceiptEmail({...receiptEmail, sendReceipt: e.target.checked})}
              />}
              label={t('ballot.dialog_send_receipt')}
            />
          <TextField
                    id="receipt-email"
                    inputProps={{ "aria-label": "Receipt Email" }}
                    label={t('ballot.dialog_email_placeholder')}
                    fullWidth
                    type="text"
                    value={receiptEmail.email}
                    disabled={!receiptEmail.sendReceipt}
                    sx={{
                        mx: { xs: 0, },
                        my: { xs: 1 },
                        boxShadow: 2,
                    }}
                    onChange={(e) => setReceiptEmail({...receiptEmail, email: e.target.value})}
                />
            {pages.map((page, pageIndex) => (
              <Box key={pageIndex}>
                <Typography variant="h6">
                  {election.races[page.race_index].title}
                </Typography>
                {pageIsUnderVote(page) ?
                  <Typography variant="body1" color='var(--ltbrand-blue)'>
                    <b>{t("ballot.dialog_abstention")}</b>
                  </Typography>
                  :
                  page.candidates.map(candidate => (
                    <Typography key={candidate.candidate_id} variant="body1">
                      {`${candidate.candidate_name}: ${candidate.score ? candidate.score : 0}`}
                    </Typography>
                  ))
                }
              </Box>
            ))}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <SecondaryButton
            onClick={() => setIsOpen(false)}>
            {t('ballot.dialog_cancel')}
          </SecondaryButton>
          <PrimaryButton
            onClick={() => submit()}>
            {t('ballot.dialog_submit')}
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default VotePage
