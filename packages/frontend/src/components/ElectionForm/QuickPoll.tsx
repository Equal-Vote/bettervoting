import { useContext, useState } from 'react';
import { useNavigate } from "react-router";
import structuredClone from '@ungap/structured-clone';
import { PrimaryButton, SecondaryButton, StyledTextField, Tip } from '../styles.js';
import { Box, capitalize, Checkbox, FormControlLabel, FormHelperText, IconButton, MenuItem, Paper, Radio, RadioGroup, Select, SelectChangeEvent, Step, StepContent, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEditElection, usePostElection } from '../../hooks/useAPI';
import { useCookie } from '../../hooks/useCookie';
import { NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import { CreateElectionContext } from './CreateElectionDialog.js';
import useSnackbar from '../SnackbarContext.js';
import { makeID, makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

import { methodTextKeyToValue, RowButtonWithArrow, useSubstitutedTranslation } from '../util.jsx';
import useAuthSession from '../AuthSessionContextProvider.js';
import RaceForm from './Races/RaceForm.js';
import { useEditRace } from './Races/useEditRace.js';
import { VotingMethod } from '@equal-vote/star-vote-shared/domain_model/Race';
import { TermType } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import useConfirm from '../ConfirmationDialogProvider.js';
import { ElectionTitleField } from './Details/ElectionDetailsForm.js';
import { Check, CheckBox } from '@mui/icons-material';

const makeDefaultElection = () => {
    const ids = [];
    for(let i = 0; i < 3; i++){
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
        races: [
            {   
                title: '',
                race_id: '0',
                num_winners: 1,
                voting_method: undefined,
                candidates: ids.map(id => ({
                    candidate_id: id,
                    candidate_name: ''
                })),
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
    } as NewElection;
}

const QuickPoll = () => {
    const authSession = useAuthSession();
    const [tempID] = useCookie('temp_id', '0')
    const navigate = useNavigate()
    //const [methodKey, setMethodKey] = useState('star');
    const [page, setPage] = useState(0);
    const { isPending, makeRequest: postElection } = usePostElection()
    const { setSnack} = useSnackbar();
    const [election, setElectionData] = useState<NewElection>(makeDefaultElection())
    const { editedRace, errors, setErrors, applyRaceUpdate} = useEditRace(election, null, 0)

    const confirm = useConfirm();

    const [activeMethodStep, setActiveMethodStep] = useState(0);
    const [stepperStep, setStepperStep] = useState(0);

    const {t} = useSubstitutedTranslation('poll');

    const onSubmitElection = async (election) => {
        // calls post election api, throws error if response not ok
        const newElection = await postElection(
            {
                Election: election,
            })
        if ((!newElection)) {
            throw Error("Error submitting election");
        }
        setElectionData(makeDefaultElection())
        navigate(`/${newElection.election.election_id}`)
    }
    const applyElectionUpdate = (updateFunc) => {
        const electionCopy = structuredClone(election)
        updateFunc(electionCopy)
        setElectionData(electionCopy)
    };

    const createElectionContext = useContext(CreateElectionContext);

    //const validateForm = (e) => {
    //    e.preventDefault()

    //    if (!election.title) {
    //        setSnack({
    //            message: 'Must specify poll title',
    //            severity: 'warning',
    //            open: true,
    //            autoHideDuration: 6000,
    //        });
    //        return false;
    //    }

    //    if(election.races[0].candidates.filter(c => c.candidate_name != '').length < 2){
    //        setSnack({
    //            message: 'Must provide at least 2 options',
    //            severity: 'warning',
    //            open: true,
    //            autoHideDuration: 6000,
    //        });
    //        return false;
    //    }

    //    return true;
    //}

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
        setElectionData(updatedElection)
    }

    const handleEnter = (event) => {
        // Go to next entry instead of submitting form
        const form = event.target.form;
        const index = Array.prototype.indexOf.call(form, event.target);
        form.elements[index + 2].focus();
        event.preventDefault();
    }

    const width = '500px';

    const onNext = async () => {
        const confirmed = await confirm(t('landing_page.quick_poll.publish_confirm'));
        if (confirmed) {
            navigate(`/pet`)
        }else{
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

    const StepButtons = ({ activeStep, setActiveStep, canContinue }: { activeStep: number, setActiveStep: React.Dispatch<React.SetStateAction<number>>, canContinue: boolean }) => <>
        {activeStep > 0 &&
            <SecondaryButton
                onClick={() => setActiveStep(i => i - 1)}
                sx={{ mt: 1, mr: 1 }}
            >
                Back
            </SecondaryButton>
        }
        {activeStep < 2 && // hard coding this for now
            <PrimaryButton
                fullWidth={false}
                variant="contained"
                disabled={!canContinue}
                onClick={() => setActiveStep(i => i + 1)}
                sx={{ mt: 1, mr: 1 }}
            >
                Continue
            </PrimaryButton>
        }
    </>

    return (
        <Paper elevation={5} sx={{
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
                    <Typography variant='h5' color={'lightShade.contrastText'}>{t('landing_page.quick_poll.title')}</Typography>
                    <Box display='flex' flexDirection='column' justifyContent='center'>
                        <Typography>
                            {t('election_creation.term_question')}
                            <Tip name='polls_vs_elections' />
                        </Typography>
                        <RadioGroup row sx={{mx: 'auto'}}>
                            {['poll', 'election'].map((type, i) =>
                                <FormControlLabel
                                    key={i}
                                    value={capitalize(t(`keyword.${type}.election`))}
                                    control={<Radio />}
                                    label={capitalize(t(`keyword.${type}.election`))}
                                    onClick={() => applyElectionUpdate(e => { e.settings.term_type = type as TermType })}
                                    checked={election.settings.term_type === type}
                                />
                            )}
                        </RadioGroup>
                    </Box>
                    <RaceForm
                        election={election}
                        race_index={0}
                        editedRace={editedRace}
                        errors={errors}
                        setErrors={setErrors}
                        applyRaceUpdate={applyRaceUpdate}
                        activeStep={activeMethodStep}
                        setActiveStep={setActiveMethodStep}
                    />
                    <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1} sx={{mt: 3}}>
                        <SecondaryButton onClick={() => setPage(pg => pg+1)}>Add Candidates Later</SecondaryButton>
                        <PrimaryButton onClick={onNext}>Next</PrimaryButton>
                    </Box>
                </Box>
                <Box sx={{...pageSX, textAlign: 'left'}}>
                    <Typography variant='h5' color={'lightShade.contrastText'}>just a few more questions...</Typography>
                    <Stepper activeStep={stepperStep} orientation="vertical">
                        <Step>
                            <StepLabel>{t('election_creation.title_title')} <strong>{election.title && election.title}</strong></StepLabel>
                            <StepContent>
                                <Typography>{t('election_creation.title_question')}</Typography>
                                <FormControlLabel control={<Checkbox defaultChecked />} label="same as poll question"/>
                                <TextField
                                    inputProps={{ "aria-label": "Title" }}
                                    error={false}
                                    required
                                    disabled={true}
                                    id="election-title"
                                    label={t('election_details.title')}
                                    type="text"
                                    value={election.races[0].title}
                                    sx={{
                                        m: 0,
                                        p: 0,
                                        boxShadow: 2,
                                    }}
                                    fullWidth
                                    onChange={(e) => {
                                        election.title = e.target.value;
                                    }}
                                />
                                <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                                    {/* TODO: Add errors */}
                                </FormHelperText>
                                <StepButtons activeStep={0} setActiveStep={setStepperStep} canContinue={true}/> {/*canContinue={/^[^\s][a-zA-Z0-9\s]{3,49}$/.test(election.title) /*&& errors.title == ''} />*/}
                            </StepContent>
                        </Step>
                        <Step>
                            <StepLabel>{t('election_creation.restricted_title')} <strong>
                                {election.settings.voter_access !== undefined && t(`keyword.${election.settings.voter_access === 'closed' ? 'yes' : 'no'}`)}
                            </strong></StepLabel>
                            <StepContent>
                                <Typography>
                                    {t('election_creation.restricted_question')}
                                </Typography>

                                <RadioGroup row>
                                    {[true, false].map((restricted, i) =>
                                        <FormControlLabel
                                            key={i}
                                            value={restricted}
                                            control={<Radio />}
                                            label={t(`keyword.${restricted ? 'yes' : 'no'}`)}
                                            onClick={() => {
                                                //setElection({
                                                //    ...election, settings: {
                                                //        ...election.settings,
                                                //        voter_access: restricted ? 'closed' : 'open',
                                                //        contact_email: restricted ? (
                                                //            (election.settings.contact_email != undefined && election.settings.contact_email != '') ?
                                                //                election.settings.contact_email : authSession.getIdField('email')
                                                //        ) : ''
                                                //    }
                                                //})
                                                election.settings.voter_access = restricted ? 'closed' : 'open'
                                            }}
                                            checked={election.settings.voter_access === (restricted ? 'closed' : 'open')}
                                        />
                                    )}
                                </RadioGroup>

                                <Box sx={{
                                    // 60px copied from unset, then added some for padding
                                    height: (election.settings.voter_access == 'closed' ? '90px' : 0),
                                    opacity: (election.settings.voter_access == 'closed' ? 1 : 0),
                                    transition: 'height .4s, opacity .7s',
                                    overflow: 'hidden',
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <FormControlLabel control={
                                        <TextField
                                            id='contact_email'
                                            name='contact_email'
                                            value={election.settings.contact_email}
                                            onChange={(e) => 
                                                //setElection({
                                                //    ...election, settings: {
                                                //        ...election.settings,
                                                //        contact_email: e.target.value
                                                //    }
                                                //})
                                                election.settings.contact_email = e.target.value
                                            }
                                            variant='standard'
                                            fullWidth
                                            sx={{ mt: -1, display: 'block' }}
                                        />}
                                        label={t(`election_settings.contact_email`)}
                                        labelPlacement='top'
                                        sx={{
                                            alignItems: 'start',
                                        }}
                                    />
                                </Box>

                                <StepButtons activeStep={1} setActiveStep={setStepperStep} canContinue={election.settings.voter_access !== undefined} />
                            </StepContent>
                        </Step>
                        <Step>
                            <StepLabel>{t('election_creation.template_title')}</StepLabel>
                            <StepContent>
                                <Typography>
                                    {t('election_creation.template_prompt')}
                                </Typography>
                                <Box style={{ height: '10px' }} /> {/*hacky padding*/}
                                {(election.settings.voter_access === 'closed' ? ['email_list', 'id_list'] : ['demo', 'unlisted']).map((name) =>
                                    <RowButtonWithArrow
                                        title={t(`election_creation.${name}_title`)}
                                        description={t(`election_creation.${name}_description`)}
                                        key={name}
                                        //onClick={() => onAddElection(templateMappers[name](election))}
                                        onClick={() => navigate('/pet/admin')}
                                        ariaLabel={t(`election_creation.${name}_title`)}
                                    />
                                )}

                                <StepButtons activeStep={2} setActiveStep={setStepperStep} canContinue={false} />
                            </StepContent>
                        </Step>
                    </Stepper>
                </Box>
            </Box>
        </Paper>
    )
}

export default QuickPoll
