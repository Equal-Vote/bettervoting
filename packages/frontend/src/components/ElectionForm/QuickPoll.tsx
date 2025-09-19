import { useContext, useState } from 'react';
import { useNavigate } from "react-router";
import structuredClone from '@ungap/structured-clone';
import { PrimaryButton, SecondaryButton, StyledTextField } from '../styles.js';
import { Box, IconButton, MenuItem, Paper, Select, SelectChangeEvent, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePostElection } from '../../hooks/useAPI';
import { useCookie } from '../../hooks/useCookie';
import { NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import { CreateElectionContext } from './CreateElectionDialog.js';
import useSnackbar from '../SnackbarContext.js';
import { makeID, makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

import { useSubstitutedTranslation } from '../util.jsx';
import useAuthSession from '../AuthSessionContextProvider.js';

const QuickPoll = () => {
    const authSession = useAuthSession();
    const [tempID] = useCookie('temp_id', '0')
    const navigate = useNavigate()
    const [methodKey, setMethodKey] = useState('star');
    const { isPending, makeRequest: postElection } = usePostElection()
    const { setSnack} = useSnackbar();

    const {t} = useSubstitutedTranslation('poll');

    // TODO: we may edit the db entries in the future so that these align
    // NOTE: this is redundant with methodValueToTextKey in util
    const dbKeys = {
        'star': 'STAR',
        'approval': 'Approval',
        'ranked_robin': 'RankedRobin',
        'rcv': 'IRV',
        'choose_one': 'Plurality',
    }

    const existingIds = new Set<string>();
    const generateUniqueCandidateId = () => {
        const hasCollision = (id: string) => existingIds.has(id);
        const newId = makeUniqueIDSync(
            ID_PREFIXES.CANDIDATE, 
            ID_LENGTHS.CANDIDATE,
            hasCollision
        );
        existingIds.add(newId);
        return newId;
    };

    const QuickPollTemplate: NewElection = {
        title: '',
        state: 'open',
        frontend_url: '',
        owner_id: '0',
        is_public: false,
        ballot_source: 'live_election',
        races: [
            {   
                title: '',
                race_id: '0',
                num_winners: 1,
                voting_method: 'STAR',
                candidates: [
                    {
                        candidate_id: generateUniqueCandidateId(),
                        candidate_name: '',
                    },
                    {
                        candidate_id: generateUniqueCandidateId(),
                        candidate_name: '',
                    },
                    {
                        candidate_id: generateUniqueCandidateId(),
                        candidate_name: '',
                    }
                ],
                precincts: undefined,
            }
        ],
        settings: {
            voter_access: 'open',
            voter_authentication: {
                voter_id: true,
            },
            ballot_updates: false,
            public_results: true,
            random_candidate_order: false,
            require_instruction_confirmation: true,
            draggable_ballot: false,
            term_type: 'poll',
        }
    }

    const [election, setElectionData] = useState<NewElection>(QuickPollTemplate)
    const onSubmitElection = async (election) => {
        // calls post election api, throws error if response not ok
        const newElection = await postElection(
            {
                Election: election,
            })
        if ((!newElection)) {
            throw Error("Error submitting election");
        }
        setElectionData(QuickPollTemplate)
        navigate(`/${newElection.election.election_id}`)
    }
    const applyElectionUpdate = (updateFunc) => {
        const electionCopy = structuredClone(election)
        updateFunc(electionCopy)
        setElectionData(electionCopy)
    };

    const createElectionContext = useContext(CreateElectionContext);

    const validateForm = (e) => {
        e.preventDefault()

        if (!election.title) {
            setSnack({
                message: 'Must specify poll title',
                severity: 'warning',
                open: true,
                autoHideDuration: 6000,
            });
            return false;
        }

        if(election.races[0].candidates.filter(c => c.candidate_name != '').length < 2){
            setSnack({
                message: 'Must provide at least 2 options',
                severity: 'warning',
                open: true,
                autoHideDuration: 6000,
            });
            return false;
        }

        return true;
    }

    const onSubmit = (e) => {
        if(!validateForm(e)) return;

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
            newElection.races[0].voting_method = dbKeys[methodKey];
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
        setElectionData(updatedElection)
    }
    const handleEnter = (event) => {
        // Go to next entry instead of submitting form
        const form = event.target.form;
        const index = Array.prototype.indexOf.call(form, event.target);
        form.elements[index + 2].focus();
        event.preventDefault();
    }

    return (
        <Paper elevation={5} sx={{
            maxWidth: '613px',
            margin: 'auto',
        }}>
        <form onSubmit={onSubmit} >
            <Box 
            sx={{
                display: 'flex',
                gap: 2,
                flexDirection: 'column',
                textAlign: 'center',
                //backgroundColor: //'lightShade.main',
                padding: 3,
                borderRadius: '20px',
                minWidth: {xs: '0px', md: '400px'}
            }}>
                {/*we use comonent here instead of variant since we want the styling to match p*/}
                <Typography variant='h5' color={'lightShade.contrastText'}>{t('landing_page.quick_poll.title')}</Typography>
                <Select value={methodKey} onChange={(ev: SelectChangeEvent) => setMethodKey(ev.target.value as string)}>
                    <MenuItem value={'star'}>{t(`methods.star.full_name`)}</MenuItem>
                    <MenuItem value={'approval'}>{t(`methods.approval.full_name`)}</MenuItem>
                    <MenuItem value={'ranked_robin'}>{t(`methods.ranked_robin.full_name`)}</MenuItem>
                    <MenuItem value={'choose_one'}>{t(`methods.choose_one.full_name`)}</MenuItem>
                    <MenuItem value={'rcv'}>{t(`methods.rcv.full_name`)}</MenuItem>
                    <MenuItem disabled sx={{maxWidth: '350px', whiteSpace: 'normal'}}>{
                        t(`landing_page.hero.methods.more_methods.${
                            authSession.isLoggedIn()? 'full_editor_description' : 'sign_in_description'
                        }`)
                    }</MenuItem>
                </Select>
                <StyledTextField
                    autoFocus
                    id="election-name"
                    name="name"
                    type="text"
                    value={election.title}
                    label={t('landing_page.quick_poll.question_prompt')}
                    inputProps={{
                        minLength: 3
                    }}
                    required 
                    onChange={(e) => {
                        applyElectionUpdate(election => { election.title = e.target.value })
                    }}
                    onKeyPress={(ev) => {
                        if (ev.key === 'Enter') {
                            handleEnter(ev)
                        }
                    }}
                />
                {election.races[0].candidates?.map((candidate, index) => (
                    <StyledTextField
                        key={index}
                        id={`candidate-name-${String(index)}`}
                        name="candidate-name"
                        type="text"
                        value={candidate.candidate_name}
                        label={t('landing_page.quick_poll.option_prompt', {number: index+1})}
                        onChange={(e) => {
                            onUpdateCandidate(index, e.target.value)
                        }}
                        onKeyPress={(ev) => {
                            if (ev.key === 'Enter') {
                                handleEnter(ev)
                            }
                        }}
                    />
                ))}
                <Box sx={{
                    marginLeft: 'auto'
                }}>
                    <IconButton
                        type="button"
                        onClick={() => setElectionData(QuickPollTemplate)}
                        >
                            <Typography component="p">{t('landing_page.quick_poll.clear_all')}</Typography>
                        <DeleteIcon />
                    </IconButton>
                </Box>
                <PrimaryButton
                    type='submit'
                    disabled={isPending} >
                    {t('landing_page.quick_poll.create')}
                </PrimaryButton>
                    
                <SecondaryButton
                    onClick={(e) => {
                        if(authSession.isLoggedIn()){
                            if(validateForm(e)){
                                createElectionContext.openDialog(election)
                            }
                        }else{
                            authSession.openLogin()
                        } 
                    }}
                    disabled={isPending}
                >
                    {authSession.isLoggedIn() ? t('landing_page.quick_poll.continue_with_editor') : t('landing_page.quick_poll.sign_in')}
                </SecondaryButton>
            </Box>
        </form >
        </Paper>
    )
}

export default QuickPoll
