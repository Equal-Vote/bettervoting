import { useState } from 'react';
import { useNavigate } from "react-router";
import { PrimaryButton } from '../../styles.js';
import { Box, Breakpoint, Paper, Typography, useMediaQuery } from '@mui/material';
import { usePostElection } from '~/hooks/useAPI';
import { useCookie } from '~/hooks/useCookie';
import { NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import useSnackbar from '../../SnackbarContext.js';
import { makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

import { StringObject, TransitionBox, useSubstitutedTranslation } from '../../util.js';
import useAuthSession from '../../AuthSessionContextProvider.js';
import RaceForm from '../Races/RaceForm.js';
import useConfirm from '../../ConfirmationDialogProvider.js';
import WizardExtra from './WizardExtra.js';
import { ElectionContextProvider } from '../../ElectionContextProvider.js';
import WizardBasics from './WizardBasics.js';
import { useTheme } from '@mui/material';

export const makeDefaultElection = () => {
    const ids = [];
    for(let i = 0; i < 1; i++){
        ids.push(makeUniqueIDSync(
            ID_PREFIXES.CANDIDATE, 
            ID_LENGTHS.CANDIDATE,
            (id: string) => ids.includes(id)
        ));
    }

    return {
        title: '',
        state: 'draft',
        frontend_url: '',
        owner_id: '0',
        is_public: false,
        ballot_source: 'live_election',
        races: [ {   
            title: '',
            race_id: '0',
            num_winners: undefined,
            voting_method: undefined,
            candidates: ids.map(id => ({
                candidate_id: id,
                candidate_name: ''
            })),
            precincts: undefined,
        } ],
        settings: {
            voter_access: 'open',
            voter_authentication: {
                voter_id: true,
            },
            ballot_updates: false,
            public_results: true,
            random_candidate_order: true,
            require_instruction_confirmation: true,
            draggable_ballot: false,
            term_type: undefined,
        }
    } as NewElection
};

const Wizard = () => {
    const authSession = useAuthSession();
    const [tempID] = useCookie('temp_id', '0')
    const navigate = useNavigate()
    const [page, setPage] = useState(0);
    const { isPending, makeRequest: postElection } = usePostElection()
    const [election, setElection] = useState<NewElection>(makeDefaultElection())
    const [multiRace, setMultiRace] = useState(undefined);

    const confirm = useConfirm();

    const {t} = useSubstitutedTranslation(election.settings.term_type);

    const onAddElection = async (election, subPage) => {
        election.owner_id = authSession.isLoggedIn() ? authSession.getIdField('sub') : tempID;

        const newElection = await postElection({Election: election})
        if (!newElection) throw Error("Error submitting election");

        navigate(`/${newElection.election.election_id}${subPage}`)
    }


    const theme = useTheme(); 

    const width: StringObject = {xs: '250px', sm: '500px'};
    const getWidth = () => {
        const keys: Breakpoint[] = ['sm', 'xs']; // biggest to smallest, must match width keys
        // NOTE: I'm precomputing ups so that we don't get an error for variable number of hooks
        const ups = keys.map(key => useMediaQuery(theme.breakpoints.up(key), {noSsr: true}));
        return Number(width[keys.find((_, i) => ups[i])].replace('px', ''));
    }

    const onNext = async (editedRace) => {
        const updatedElection = {
            ...election,
            races: [editedRace],
            title: editedRace.title,
        }
        const confirmed = await confirm(t('wizard.publish_confirm'));
        if (confirmed) {
            onAddElection({...updatedElection, state: 'finalized'}, '/')
        }else{
            setElection(updatedElection)
            setPage(1);
        }
    }

    const pageSX = {
        display: 'flex',
        gap: 0,
        width: width,
        flexDirection: 'column',
        textAlign: 'center',
        //backgroundColor: //'lightShade.main',
        padding: 3,
        borderRadius: '20px',
        minWidth: {xs: '0px', md: '400px'}
    }

    return <ElectionContextProvider id={undefined} localElection={election} setLocalElection={setElection}>
        <Paper className='wizard' elevation={5} sx={{
            //maxWidth: '613px',
            width: width,
            margin: 'auto',
            overflow: 'clip',
        }}>
            <Box
                sx={{
                    position: 'relative',
                    width: `${getWidth()*2}px`,
                    left: `-${page*getWidth()}px`,
                    transition: 'left 1s',
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <Box sx={pageSX}>
                    <Typography variant='h5' color={'lightShade.contrastText'}>{t('wizard.title')}</Typography>
                    <WizardBasics multiRace={multiRace} setMultiRace={setMultiRace}/>
                    <Box sx={{position: 'relative'}}>
                        <TransitionBox absolute enabled={multiRace === true} sx={{textAlign: 'left', pl: 1}}>
                            {t('wizard.add_races_later')}
                            <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1} sx={{mt: 3}}>
                                <PrimaryButton onClick={() => setPage(1)}>Next</PrimaryButton>
                            </Box>
                        </TransitionBox>
                    </Box>
                    <TransitionBox enabled={multiRace === false}>
                        <RaceForm
                            raceIndex={0}
                            onConfirm={onNext}
                            styling='Wizard'
                        />
                    </TransitionBox>
                </Box>
                <Box sx={{...pageSX, textAlign: 'left'}}>
                    <WizardExtra onBack={() => setPage(pg => pg-1)} multiRace={multiRace} onAddElection={onAddElection}/>
                </Box>
            </Box>
        </Paper>
    </ElectionContextProvider>
}

export default Wizard
