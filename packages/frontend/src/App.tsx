import { useContext } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeContextProvider } from './theme'
import Header from './components/Header'
import Election from './components/Election/Election'
import Sandbox from './components/Sandbox'
import LandingPage from './components/LandingPage'
import { Box, CssBaseline, Typography } from '@mui/material'
import { SnackbarContextProvider } from './components/SnackbarContext'
import Footer from './components/Footer'
import { ConfirmDialogProvider } from './components/ConfirmationDialogProvider'
import About from './components/About'
import { AuthSessionContextProvider } from './components/AuthSessionContextProvider'
import ElectionInvitations from './components/Elections/ElectionInvitations'
import ElectionsYouManage from './components/Elections/ElectionsYouManage'
import ElectionsYouVotedIn from './components/Elections/ElectionsYouVotedIn'
import OpenElections from './components/Elections/OpenElections'
import { FeatureFlagContextProvider } from './components/FeatureFlagContextProvider'
import CreateElectionDialog, { CreateElectionContextProvider } from './components/ElectionForm/CreateElectionDialog'
import ComposeContextProviders from './components/ComposeContextProviders'
import './i18n/i18n'
import ReturnToClassicDialog, { ReturnToClassicContext, ReturnToClassicContextProvider } from './components/ReturnToClassicDialog'
import { useSubstitutedTranslation } from './components/util'
import UploadElections from './components/UploadElections'
import Redirect from './components/Redirect'
import PublicArchive from './components/Elections/PublicArchive'
import NameMatchingTester from './components/NameMatchingTester'
import StyleGuide from './components/StyleGuide'
import { PrimaryButton } from './components/styles'
import ScrollToTop from './hooks/scrollToTop'

const App = () => {
  const {t} = useSubstitutedTranslation();

  const ReturnToClassicLayer = () => {
    const returnToClassicContext = useContext(ReturnToClassicContext);
    return <>
      <Box sx={{ position: 'fixed', pointerEvents: 'none', display: {xs: 'none', md: 'flex'}, flexDirection: 'column-reverse', alignItems: 'flex-end', width: '100%', height: '100%', paddingBottom: '90px', paddingRight: '30px'}}>
          {/*Color is copied from the feedback button*/}
          <PrimaryButton sx={{pointerEvents: 'auto', width: '170px', fontSize: 10}}  onClick={returnToClassicContext.openDialog} aria-label="Return to Classic" >
              {t('return_to_classic.button')}
          </PrimaryButton >
      </Box>
      <ReturnToClassicDialog/>
    </>
  }
  return (
    <Router>
      <ScrollToTop/>
      <ComposeContextProviders providers={[
        FeatureFlagContextProvider,
        ThemeContextProvider,
        AuthSessionContextProvider,
        ConfirmDialogProvider,
        SnackbarContextProvider,
        CreateElectionContextProvider,
        ReturnToClassicContextProvider,
      ]}>
        <CssBaseline />
        <Box display='flex' flexDirection='column' minHeight={'100vh'} sx={{backgroundColor:'white'}} >
          <ReturnToClassicLayer/>
          <Header />
          <CreateElectionDialog/>
          <Typography sx={{textAlign:'center', padding: 2, opacity: 0.5}}>
            {t('nav.beta_warning')}
          </Typography>
          <Box
            sx={{
              width: '100%',
            }}>
            <Routes>
              <Route path='/' element={<LandingPage />} />
              <Route path='/Feedback' element={<LandingPage />} />   {/*creating a new route for feedback page while still loading the landing page*/}
              <Route path='/About' element={<About />} />
              <Route path='/ElectionInvitations' element={<ElectionInvitations />} />
              <Route path='/ElectionsYouManage' element={<ElectionsYouManage />} />
              <Route path='/ElectionsYouVotedIn' element={<ElectionsYouVotedIn />} />
              <Route path='/UploadElections' element={<UploadElections />} />
              <Route path='/OpenElections' element={<OpenElections />} />
              <Route path='/PublicArchive' element={<PublicArchive />} />
              {/*Keeping old path for legacy reasons, although we can probably remove it once the domain moves from dev.star.vote*/}
              <Route path='/Election/:id/*' element={<Election />} /> 
              <Route path='/:id/*' element={<Election />} />
              <Route path='/Sandbox' element={<Sandbox />} />
              <Route path='/Volunteer' element={<Redirect href={'https://docs.bettervoting.com/contributions/0_contribution_guide.html'}/>} />
              <Route path='/PaperBallots' element={<Redirect href={'https://docs.bettervoting.com/help/paper_ballots.html'}/>} />
              <Route path='/NameMatchTesting' element={<NameMatchingTester />} />
              <Route path='/StyleGuide' element={<StyleGuide/>} />
            </Routes>
          </Box>
          <Footer />
        </Box>
      </ComposeContextProviders>
    </Router>
  );
}

export default App;
