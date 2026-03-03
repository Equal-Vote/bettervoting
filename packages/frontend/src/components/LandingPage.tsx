import { useContext, useEffect, useRef } from 'react'
import Box from '@mui/material/Box';
import LandingPageFeatures from './LandingPage/LandingPageFeatures';
import LandingPageSignUpBar from './LandingPage/LandingPageSignUpBar';
import LandingPageTestimonials from './LandingPage/LandingPageTestimonials';
import { Paper, Typography } from '@mui/material';
import LandingPagePricing from './LandingPage/LandingPagePricing';
import useFeatureFlags from './FeatureFlagContextProvider';
import LandingPageStats from './LandingPage/LandingPageStats';
import{useLocation} from 'react-router-dom';
import { openFeedback, scrollToElement, useSubstitutedTranslation } from './util';
import Wizard from './ElectionForm/Wizard/Wizard';
import LandingPageSupport from './LandingPage/LandingPageSupport';
import LandingPageCarousel from './LandingPage/LandingPageCarousel';
import LandingPageFeaturedElections from './LandingPage/LandingPageFeaturedElections';
import LandingPageOtherTools from './LandingPage/LandingPageOtherTools';

const LandingPage = () => {

    const checkUrl = useLocation();
    useEffect(() =>{
        if(checkUrl.pathname === "/feedback")
        {
            openFeedback();
        }

        if(checkUrl.pathname === "/new_election")
        {
            scrollToElement(document.querySelector(`.wizard`))
        }
    }, [checkUrl]);

    
    const flags = useFeatureFlags();

    const boxRef = useRef(null);
    const featuredElectionIds = process.env.REACT_APP_FEATURED_ELECTIONS.split(',').filter(Boolean);
    const {t} = useSubstitutedTranslation('election');

    //apparently box doesn't have onScroll
    return (
        <div ref={boxRef}>

        <Box className='gradBackground' sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            margin: 'auto',
        }}> 
            <Box display='flex' flexDirection='column' sx={{
                margin: 'auto',
                width: '100%',
                maxWidth: '1200px',
                p: { xs: 2, md: 2 },
                alignItems: 'center',
                textAlign: 'center',
            }}>
                <Typography variant="h4" color={'lightShade.contrastText'}> {t('landing_page.hero.title')} </Typography>
                <LandingPageCarousel />
                <Typography component="p" sx={{margin: 'auto', width: '80%', textAlign: 'center', mt: 4}}>
                    <i>"BetterVoting is your one-stop, open-source tool for handling all your election needs. Whether it's informal polls or highly secure elections, electronic or paper, single-seat or multi-seat, we've got you covered!" <span className="nobr">- The BetterVoting Team</span></i>
                </Typography>
            </Box>
            <LandingPageStats/>
            {/* putting the anchor on the Wizard component scrolls too far */}
            <div id='wizard'></div>
            <Wizard/>
            {featuredElectionIds.length > 0 && <LandingPageFeaturedElections electionIds={featuredElectionIds}/>}
            <LandingPageFeatures/>
            <LandingPageSignUpBar />
            {flags.isSet('ELECTION_TESTIMONIALS') && <LandingPageTestimonials/>}
            <LandingPagePricing />
            <LandingPageSupport />
            <LandingPageOtherTools />
        </Box>
        </div>
    )
}

export default LandingPage
