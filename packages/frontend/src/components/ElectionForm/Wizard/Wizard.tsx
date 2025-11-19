import { useContext, useState } from 'react';
import { useNavigate } from "react-router";
import structuredClone from '@ungap/structured-clone';
import { Election as IElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import { PrimaryButton, SecondaryButton, Tip } from '../../styles.js';
import { Box, capitalize, Checkbox, FormControlLabel, FormHelperText, IconButton, MenuItem, Paper, Radio, RadioGroup, Select, SelectChangeEvent, Step, StepContent, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import { usePostElection } from '~/hooks/useAPI';
import { useCookie } from '~/hooks/useCookie';
import { NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import useSnackbar from '../../SnackbarContext.js';
import { makeID, makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

import { methodTextKeyToValue, RowButtonWithArrow, TransitionBox, useSubstitutedTranslation } from '../../util.js';
import useAuthSession from '../../AuthSessionContextProvider.js';
import RaceForm from '../Races/RaceForm.js';
import { VotingMethod } from '@equal-vote/star-vote-shared/domain_model/Race';
import useConfirm from '../../ConfirmationDialogProvider.js';
import WizardExtra from './WizardExtra.js';
import { ElectionContextProvider } from '../../ElectionContextProvider.js';
import WizardBasics from './WizardBasics.js';

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
    //const [methodKey, setMethodKey] = useState('star');
    const [page, setPage] = useState(0);
    const { isPending, makeRequest: postElection } = usePostElection()
    const { setSnack} = useSnackbar();
    const [election, setElection] = useState<NewElection>(makeDefaultElection())
    const [multiRace, setMultiRace] = useState(undefined);

    const confirm = useConfirm();

    const {t} = useSubstitutedTranslation(election.settings.term_type);

    const onSubmitElection = async (election) => {
        // calls post election api, throws error if response not ok
        const newElection = await postElection(
            {
                Election: election,
            })
        if ((!newElection)) {
            throw Error("Error submitting election");
        }
        setElection(makeDefaultElection())
        navigate(`/${newElection.election.election_id}`)
    }

    const applyElectionUpdate = (updateFunc) => {
        const electionCopy = structuredClone(election)
        updateFunc(electionCopy)
        setElection(electionCopy)
    };

    const onSubmit = (e) => {
        //if(!validateForm(e)) return;

        // This assigns only the new fields, but otherwise keeps the existing election fields
        const newElection = {
            ...election,
            frontend_url: '', // base URL for the frontend
            owner_id: authSession.isLoggedIn() ? authSession.getIdField('sub') : tempID,
            state: 'open',
        }
        if (newElection.races.length === 1) {
            // If only one race, use main eleciton title and description
            newElection.races[0].title = newElection.title
            newElection.races[0].description = newElection.description
            newElection.races[0].voting_method = methodTextKeyToValue[methodKey] as VotingMethod;
        }

        const newCandidates = []
        const existingIds = new Set<string>();

        newElection.races[0].candidates.forEach(candidate => {
            if (candidate.candidate_name !== '') {
                const hasCollision = (id: string) => existingIds.has(id);
                const newId = makeUniqueIDSync(
                    ID_PREFIXES.CANDIDATE, 
                    ID_LENGTHS.CANDIDATE,
                    hasCollision
                );
                existingIds.add(newId);
                
                newCandidates.push({
                    candidate_id: newId,
                    candidate_name: candidate.candidate_name
                })
            }
        });
        newElection.races[0].candidates = newCandidates
        try {
            onSubmitElection(newElection)
        } catch (error) {
            console.error(error)
        }
    }

    const onUpdateCandidate = (index: number, name: string) => {
        const updatedElection = structuredClone(election)
        const candidates = updatedElection.races[0].candidates
        candidates[index].candidate_name = name
        if (index === candidates.length - 1) {
            // If last form entry is updated, add another entry to form
            candidates.push({
                candidate_id: makeID(ID_PREFIXES.CANDIDATE, ID_LENGTHS.CANDIDATE),
                candidate_name: '',
            })
        }
        else if (candidates.length > 3 && index === candidates.length - 2 && name === '' && candidates[candidates.length - 1].candidate_name === '') {
            // If last two entries are empty, remove last entry
            // Keep at least 3
            candidates.splice(candidates.length - 1, 1)
        }
        setElection(updatedElection)
    }

    const handleEnter = (event) => {
        // Go to next entry instead of submitting form
        const form = event.target.form;
        const index = Array.prototype.indexOf.call(form, event.target);
        form.elements[index + 2].focus();
        event.preventDefault();
    }

    const onAddElection = async (election, subPage) => {
        election.owner_id = authSession.isLoggedIn() ? authSession.getIdField('sub') : tempID;

        const newElection = await postElection({Election: election})
        if (!newElection) throw Error("Error submitting election");

        navigate(`/${newElection.election.election_id}${subPage}`)
    }

    const width = '500px';

    const onNext = async (editedRace) => {
        const updatedElection = {
            ...election,
            races: [editedRace],
            title: editedRace.title,
        }
        const confirmed = await confirm(t('election_creation.publish_confirm'));
        if (confirmed) {
            onAddElection(updatedElection, '/')
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
                    width: '1000px',
                    left: `-${page*500}px`,
                    transition: 'left 1s',
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <Box sx={pageSX}>
                    <Typography variant='h5' color={'lightShade.contrastText'}>{t('election_creation.title')}</Typography>
                    <WizardBasics multiRace={multiRace} setMultiRace={setMultiRace}/>
                    <Box sx={{position: 'relative'}}>
                        <TransitionBox absolute enabled={multiRace === true} sx={{textAlign: 'left', pl: 1}}>
                            {t('election_creation.add_races_later')}
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
