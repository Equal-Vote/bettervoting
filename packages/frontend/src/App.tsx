import { useContext, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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
import QueryTool from './components/Elections/QueryTool'

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
        ReturnToClassicContextProvider,
      ]}>
        <CssBaseline />
        {/* Disabling drag over globally so that dragging/dropping images doesn't accidentally open a new tab*/}
        <Box display='flex' flexDirection='column' minHeight={'100vh'} sx={{backgroundColor:'white'}} onDragOver={(e) => e.preventDefault()} onDrop={(e) => e.preventDefault()} >
          <ReturnToClassicLayer/>
          <Header />
          <Typography sx={{textAlign:'center', padding: 2, opacity: 0.5}}>
            {t('nav.beta_warning')}
          </Typography>
          <Box
            sx={{
              width: '100%',
            }}>
            <Routes>
              <Route path='/' element={<LandingPage />} />
              {/*creating a new route for feedback page while still loading the landing page*/}
              <Route path='/new_election' element={<LandingPage />} /> 
                <Route path='/new-election' element={<Redirect href='/new_election'/>} /> 
                <Route path='/newelection' element={<Redirect href='/new_election'/>} /> 
              <Route path='/feedback' element={<LandingPage />} />   
              <Route path='/about' element={<About />} />
              <Route path='/invitations' element={<ElectionInvitations />} />
              <Route path='/manage' element={<ElectionsYouManage />} />
              <Route path='/vote_history' element={<ElectionsYouVotedIn />} />
                <Route path='/vote-history' element={<Redirect href='/vote_history'/>} /> 
                <Route path='/votehistory' element={<Redirect href='/vote_history'/>} /> 
              <Route path='/upload_elections' element={<UploadElections />} />
                <Route path='/upload-elections' element={<Redirect href='/upload_elections'/>} /> 
                <Route path='/uploadelections' element={<Redirect href='/upload_elections'/>} /> 
              <Route path='/browse' element={<OpenElections />} />
              <Route path='/public_archive' element={<PublicArchive />} />
                <Route path='/public-archive' element={<Redirect href='/public_archive'/>} /> 
                <Route path='/publicarchive' element={<Redirect href='/public_archive'/>} /> 
              {/*Keeping old path for legacy reasons, although we can probably remove it once the domain moves from dev.star.vote*/}
              <Route path='/election/:id/*' element={<Election />} /> 
              <Route path='/:id/*' element={<Election />} />
              <Route path='/sandbox' element={<Sandbox />} />
              <Route path='/volunteer' element={<Redirect href={'https://docs.bettervoting.com/contributions/0_contribution_guide.html'}/>} />
              {/*Redirects*/}
              <Route path='/paper_ballots' element={<Redirect href={'https://docs.bettervoting.com/help/paper_ballots.html'}/>} />
                <Route path='/paper-ballots' element={<Redirect href='/paper_ballots'/>} /> 
                <Route path='/paperballots' element={<Redirect href='/paper_ballots'/>} /> 
              <Route path='/hand_count' element={<Redirect href={'https://docs.bettervoting.com/help/hand_count.html'}/>} />
                <Route path='/hand-count' element={<Redirect href='/hand_count'/>} /> 
                <Route path='/handcount' element={<Redirect href='/handcount'/>} /> 
              <Route path='/ties' element={<Redirect href={'https://docs.bettervoting.com/help/ties.html'}/>} />
              {/*Testing / Internal*/}
              <Route path='/name_match_testing' element={<NameMatchingTester />} />
                <Route path='/name-match-testing' element={<Redirect href='/name_match_testing'/>} /> 
                <Route path='/namematchtesting' element={<Redirect href='/name_match_testing'/>} /> 
              <Route path='/style_guide' element={<StyleGuide/>} />
                <Route path='/style-guide' element={<Redirect href='/style_guide'/>} /> 
                <Route path='/styleguide' element={<Redirect href='/style_guide'/>} /> 
              <Route path='/query_tool' element={<QueryTool />} />
                <Route path='/query-tool' element={<Redirect href='/query_tool'/>} /> 
                <Route path='/querytool' element={<Redirect href='/query_tool'/>} /> 
            </Routes>
          </Box>
          <Footer />
        </Box>
      </ComposeContextProviders>
    </Router>
  );
}

export default App;
