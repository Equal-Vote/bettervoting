import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useContext, useEffect, useRef, useState } from 'react'
import useAuthSession from '../AuthSessionContextProvider'
import { PrimaryButton } from '../styles'
import { BallotContext, IBallotContext } from '../Election/Voting/VotePage'
import StarBallotView from '../Election/Voting/StarBallotView'
import { VotingMethod } from '@equal-vote/star-vote-shared/domain_model/Race'
import ApprovalBallotView from '../Election/Voting/ApprovalBallotView'
import RankedBallotView from '../Election/Voting/RankedBallotView'
import { useSubstitutedTranslation } from '../util'
import { CreateElectionContext } from '../ElectionForm/CreateElectionDialog'
import { ArrowBack, ArrowForward } from '@mui/icons-material'

const LandingPageCarousel = () => {
    const authSession = useAuthSession();

    const [transitionStep, setTransitionStep] = useState(1);
    const [prevMethodIndex, setPrevMethodIndex] = useState(0);
    const [methodIndex, setMethodIndex] = useState(0);
    const timeouts = useRef([])
    const autoCycleTimeout = useRef(null);
    
    const createElectionContext = useContext(CreateElectionContext);
    
    const {t} = useSubstitutedTranslation('election');

    const [starScores, setStarScores] = useState(t('landing_page.hero.methods.star.default_scores'));
    const [approvalScores, setApprovalScores] = useState(t('landing_page.hero.methods.approval.default_scores'));
    const [rrRanks, setRrRanks] = useState(t('landing_page.hero.methods.ranked_robin.default_ranks'));

    // selected to be consistent with the Race.ts domain_model

    const methodKeys = [
        'star',
        'approval',
        'ranked_robin',
        'more_methods'
    ]

    const makeBallotContext = (scores, onUpdate, voting_method: VotingMethod):IBallotContext  => {
        const candidateNames = t('landing_page.hero.candidates')
        return {
            instructionsRead: true,
            setInstructionsRead: () => {},
            candidates: 
                scores.map((score, i) => 
                    ({
                        'candidate_id': '',
                        'candidate_name': String(candidateNames[i]),
                        'score': Number(score ?? 0),
                    })
                ),
            // this isn't used, it's just included to make typescript happy
            race: {
                "title": "",
                "race_id": "",
                "num_winners": 1,
                "voting_method": voting_method,
                "candidates": []
            },
            receiptEmail: {
                sendReceipt: false,
                email: ''
            },
            setReceiptEmail: () => {},
            // disabling since I'm not sure it's a good idea anymore
            onUpdate: () => {},//onUpdate,
            maxRankings: undefined,
        }
    }


    const fadeMs = 300;
    const autoCycleMs = 5000;
    const resetAutoCycleMs = 120000000;
    const nextMethod = (offset, allowCycle=false) => {
        if(allowCycle){
            setMethodIndex(m => {
                setPrevMethodIndex(m)
                return (m+offset) % methodKeys.length;
            })
        }else{
            const n = methodIndex + offset;
            if(n < 0 || n >= methodKeys.length) return;
            setPrevMethodIndex(methodIndex);
            setMethodIndex(n);
        }

        timeouts.current.forEach((t) => clearTimeout(t))
        setTransitionStep(0);
        timeouts.current = [
            setTimeout(() => setTransitionStep(1), fadeMs),
        ];

        if(!allowCycle){
            clearTimeout(autoCycleTimeout.current)
            autoCycleTimeout.current = setTimeout(cycleMethod, resetAutoCycleMs)
        }
    }

    const cycleMethod = () => {
        nextMethod(1, true);
        clearTimeout(autoCycleTimeout.current)
        autoCycleTimeout.current = setTimeout(cycleMethod, autoCycleMs)
    }

    useEffect(() => {
        autoCycleTimeout.current = setTimeout(cycleMethod, autoCycleMs)
        return () => clearTimeout(autoCycleTimeout.current);
    }, [])

    const animIndex = transitionStep == 0 ? prevMethodIndex : methodIndex;

    const arrowSX = {
        transition: 'transform .2s, opacity .3s ease-out',
        transform: 'scale(1.5)',
        color: 'white',
        backgroundColor: 'var(--brand-pop)',
        padding: '4px',
        fontWeight: 'bold',
        width: 'calc(30px + 8px)',
        height: 'calc(30px + 8px)',
        borderRadius: '50%',
        '&:hover': {transform: 'scale(1.65)'},
        '&:disabled': {
            backgroundColor: 'gray'
        }
    };

    return <Box width='90%' display='flex' flexDirection='row' justifyContent='space-between' sx={{alignItems: 'center' }}>
        <ArrowBack sx={{...arrowSX, opacity: (methodIndex == 0? 0 : 1)}} onClick={() => nextMethod(-1)}/>
        <Box className={`${transitionStep == 0 ? 'heroFadeOut' : 'heroFadeIn'}`} 
            display='flex' gap='50px'
            sx={{
                alignItems: 'center',
                margin: 'auto',
                flexDirection: {xs: 'column', md: 'row'},
                // height must be hard coded so that there isn't resizing when cycling between slides
                height: {xs: '500px', md: '300px'}
            }}
        >
            <Box sx={{textAlign: {xs: 'center', md: 'left'}}}>
                <Typography variant="h3" color={'lightShade.contrastText'}>
                    {t(`landing_page.hero.methods.${methodKeys[animIndex]}.title`)} 
                </Typography>
                {animIndex != methodKeys.length-1 && <Typography variant="h5" color={'lightShade.contrastText'}>
                    {t(`landing_page.hero.methods.${methodKeys[animIndex]}.recommendation`)} 
                </Typography>}
            </Box>
            <Box
            >
                {animIndex != methodKeys.length-1 ? <>
                    <Box className="heroBallot" sx={{width: {xs: '100%', md:'100%'}, maxWidth: '450px', margin: 'auto'}}>
                        {animIndex == 0 && <BallotContext.Provider value={makeBallotContext(starScores, setStarScores, 'STAR')}>
                            <StarBallotView onlyGrid={true}/>
                        </BallotContext.Provider>}
                        {animIndex == 1 && <BallotContext.Provider value={makeBallotContext(approvalScores, setApprovalScores, 'Approval')}>
                            <ApprovalBallotView onlyGrid={true}/>
                        </BallotContext.Provider>}
                        {animIndex == 2 && <BallotContext.Provider value={makeBallotContext(rrRanks, setRrRanks, 'RankedRobin')}>
                            <RankedBallotView onlyGrid={true}/>
                        </BallotContext.Provider>}
                    </Box>
                </>:<Box sx={{maxWidth: '450px', margin: 'auto'}}>
                    <Typography color={'lightShade.contrastText'}>
                        {t(`landing_page.hero.methods.more_methods.${
                            authSession.isLoggedIn()? 'full_editor_description' : 'sign_in_description'
                        }`)}.
                    </Typography>
                    <br/>
                    {authSession.isLoggedIn() &&
                        <PrimaryButton
                            fullWidth
                            onClick={() => createElectionContext.openDialog()}
                        >
                            Use Full Editor
                        </PrimaryButton>
                    }
                    {!authSession.isLoggedIn() &&
                        <PrimaryButton
                            type='submit'
                            onClick={() => authSession.openLogin()}
                            sx={{
                                width: '75%'
                            }}
                        >
                            {t('landing_page.hero.methods.more_methods.sign_in')}
                        </PrimaryButton>
                    }
                </Box>}
            </Box>
        </Box>
        <ArrowForward sx={{...arrowSX, opacity: (methodIndex == methodKeys.length-1? 0 : 1)}} onClick={() => nextMethod(1)}/>
    </Box>
}

export default LandingPageCarousel;