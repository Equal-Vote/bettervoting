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
import { openFeedback, useSubstitutedTranslation } from './util';
import QuickPoll from './ElectionForm/QuickPoll';
import LandingPageSupport from './LandingPage/LandingPageSupport';
import LandingPageCarousel from './LandingPage/LandingPageCarousel';
import LandingPageFeaturedElections from './LandingPage/LandingPageFeaturedElections';
import LandingPageOtherTools from './LandingPage/LandingPageOtherTools';
import { CreateElectionContext } from './ElectionForm/CreateElectionDialog';

const LandingPage = () => {

    const checkUrl = useLocation();
    const createElectionContext = useContext(CreateElectionContext);
    useEffect(() =>{
        if(checkUrl.pathname === "/feedback")
        {
            openFeedback();
        }

        if(checkUrl.pathname === "/new_election")
        {
            createElectionContext.openDialog()
        }
    }, [checkUrl]);

    
    const flags = useFeatureFlags();

    const boxRef = useRef(null);
    const featuredElectionIds = process.env.REACT_APP_FEATURED_ELECTIONS.split(',').filter(Boolean);
    
    //It looks like atTop wasn't being used anywhere, so I'm just removing this chunk for now

    // const [atTop, setAtTop] = useState(true);

    // useEffect(() => {
    //     const handleScroll = () => {
    //         setAtTop(window.scrollY == 0);
    //     };

    //     window.addEventListener("scroll", handleScroll);
    //     return () => window.removeEventListener("scroll", handleScroll);
    // }, []);

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
            <QuickPoll/>
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
