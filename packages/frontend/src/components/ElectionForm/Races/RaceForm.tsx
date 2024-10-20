import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useState } from "react"
import { Candidate } from "@equal-vote/star-vote-shared/domain_model/Candidate"
import AddCandidate, { CandidateForm } from "../Candidates/AddCandidate"
import EditIcon from '@mui/icons-material/Edit';
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from '@mui/material/Typography';
import { Box, FormHelperText, Radio, RadioGroup, Stack, Step, StepButton, StepConnector, StepContent, StepLabel, Stepper } from "@mui/material"
import IconButton from '@mui/material/IconButton'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { scrollToElement, useSubstitutedTranslation } from '../../util';
import useElection from '../../ElectionContextProvider';
import { v4 as uuidv4 } from 'uuid';
import useConfirm from '../../ConfirmationDialogProvider';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import { SortableList } from '~/components/DragAndDrop';

export default function RaceForm({ race_index, editedRace, errors, setErrors, applyRaceUpdate }) {
    const {t} = useSubstitutedTranslation();
    const flags = useFeatureFlags();
    const [showsAllMethods, setShowsAllMethods] = useState(false)
    const [activeStep, setActiveStep] = useState(0)
    const { election } = useElection()
    const PR_METHODS = ['STV', 'STAR_PR'];
    const [methodFamily, setMethodFamily] = useState(
        editedRace.num_winners == 1?
            'single_winner'
        : (
            PR_METHODS.includes(editedRace.voting_method)?
                'proportional_multi_winner'
            :
                'bloc_multi_winner'
        )
    )
    const confirm = useConfirm();
    const inputRefs = useRef([]);
    const ephemeralCandidates = useMemo(() => 
        [...editedRace.candidates, { candidate_id: uuidv4(), candidate_name: '' }], 
        [editedRace.candidates]
    );   

    const onEditCandidate = useCallback((candidate, index) => {
        applyRaceUpdate(race => {
            if (race.candidates[index]) {
                race.candidates[index] = candidate;
            } else {
                race.candidates.push(candidate);
            }
        });

        setErrors(prev => ({ ...prev, candidates: '', raceNumWinners: '' }));
    }, [applyRaceUpdate, setErrors]);

    const handleChangeCandidates = useCallback((newCandidateList: any[]) => {
        //remove the last candidate if it is empty
        if (newCandidateList.length > 1 && newCandidateList[newCandidateList.length - 1].candidate_name === '') {
            newCandidateList.pop();
        }
        applyRaceUpdate(race => {
            race.candidates = newCandidateList;
        }
        );
    }, [applyRaceUpdate]);

    const onDeleteCandidate = useCallback(async (index) => {
        if (editedRace.candidates.length < 2) {
            setErrors(prev => ({ ...prev, candidates: 'At least 2 candidates are required' }));
            return;
        }

        const confirmed = await confirm({ title: 'Confirm Delete Candidate', message: 'Are you sure?' });
        if (confirmed) {
            applyRaceUpdate(race => {
                race.candidates.splice(index, 1);
            });
        }
    }, [confirm, editedRace.candidates.length, applyRaceUpdate, setErrors]);
    // Handle tab and shift+tab to move focus between candidates
    const handleKeyDown = useCallback((event, index) => {
        
        if (event.key === 'Tab' && event.shiftKey) {
            // Move focus to the previous candidate
            event.preventDefault();
            const prevIndex = index - 1;
            if (prevIndex >= 0 && inputRefs.current[prevIndex]) {
                inputRefs.current[prevIndex].focus();
            }
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const nextIndex = index + 1;
            if (nextIndex < ephemeralCandidates.length && inputRefs.current[nextIndex]) {
                inputRefs.current[nextIndex].focus();
            }
        } else if (event.key === 'Backspace' && event.target.value === '' && index > 0) {
            // Move focus to the previous candidate when backspacing on an empty candidate
            event.preventDefault();
            inputRefs.current[index - 1].focus();
            //this makes it so the candidate is deleted without the "are you sure?" dialog when backspacing on an empty candidate
            applyRaceUpdate(race => {
                race.candidates.splice(index, 1);
            }
            )
        }
    }, [ephemeralCandidates.length, applyRaceUpdate]);

    return (
        <>
            <Grid container sx={{ m: 0, p: 1 }} >
                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                    <TextField
                        id={`race-title-${String(race_index)}`}
                        name="title"
                        label="Title"
                        type="text"
                        error={errors.raceTitle !== ''}
                        value={editedRace.title}
                        sx={{
                            m: 0,
                            boxShadow: 2,
                        }}
                        fullWidth
                        onChange={(e) => {
                            setErrors({ ...errors, raceTitle: '' })
                            applyRaceUpdate(race => { race.title = e.target.value })
                        }
                        
                    }
                    />
                    <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                        {errors.raceTitle}
                    </FormHelperText>
                </Grid>

                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                    <TextField
                        id={`race-description-${String(race_index)}`}
                        name="description"
                        label="Description"
                        multiline
                        fullWidth
                        type="text"
                        error={errors.raceDescription !== ''}
                        value={editedRace.description}
                        sx={{
                            m: 0,
                            boxShadow: 2,
                        }}
                        onChange={(e) => {
                            setErrors({ ...errors, raceDescription: '' })
                            applyRaceUpdate(race => { race.description = e.target.value })
                        }}
                    />
                    <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                        {errors.raceDescription}
                    </FormHelperText>
                </Grid>

                {
                    flags.isSet('PRECINCTS') && election.settings.voter_access !== 'open' &&
                    <Grid item xs={12}>
                        <TextField
                            id={`race-precincts-${String(race_index)}`}
                            name="precincts"
                            label="Precincts"
                            fullWidth
                            multiline
                            type="text"
                            value={editedRace.precincts ? editedRace.precincts.join('\n') : ''}
                            sx={{
                                m: 1,
                                boxShadow: 2,
                            }}
                            onChange={(e) => applyRaceUpdate(race => {
                                if (e.target.value === '') {
                                    race.precincts = undefined
                                }
                                else {
                                    race.precincts = e.target.value.split('\n')
                                }
                            })}
                        />
                    </Grid>
                }
            </Grid>

            <Stepper nonLinear activeStep={activeStep} orientation="vertical" sx={{my: 3}}>
                <Step>
                    <StepButton onClick={() => setActiveStep(0)}>How many winners?</StepButton>
                    <StepContent>
                        <RadioGroup
                            aria-labelledby="method-family-radio-group"
                            name="method-family-radio-buttons-group"
                            value={methodFamily}
                            onChange={(e) => {
                                if(e.target.value == 'single'){
                                    setErrors({ ...errors, raceNumWinners: '' })
                                    applyRaceUpdate(race => { race.num_winners = 1 })
                                }
                                setMethodFamily(e.target.value)
                            }}
                        >
                            <FormControlLabel value="single_winner" control={<Radio />} label={t('edit_race.single_winner')} sx={{ mb: 0, pb: 0 }} />
                            <FormControlLabel value="bloc_multi_winner" control={<Radio />} label={t('edit_race.bloc_multi_winner')} sx={{ mb: 0, pb: 0 }} />
                            <FormControlLabel value="proportional_multi_winner" control={<Radio />} label={t('edit_race.proportional_multi_winner')} sx={{ mb: 0, pb: 0 }} />
                        </RadioGroup>
                        <Box sx={{
                            height: methodFamily == 'single_winner' ? 0 : '105px', // copied from the value for auto
                            opacity: methodFamily == 'single_winner' ? 0 : 1,
                            overflow: 'hidden',
                            transition: 'height .4s, opacity .7s',
                            maxWidth: '300px'
                        }}>
                            <Typography gutterBottom component="p" sx={{marginTop: 2}}>
                                <b>Number of Winners?</b>
                            </Typography>
                            <TextField
                                id={`num-winners-${String(race_index)}`}
                                name="Number Of Winners"
                                type="number"
                                error={errors.raceNumWinners !== ''}
                                fullWidth
                                value={editedRace.num_winners}
                                sx={{
                                    p: 0,
                                    boxShadow: 2,
                                }}
                                onChange={(e) => {
                                    setErrors({ ...errors, raceNumWinners: '' })
                                    applyRaceUpdate(race => { race.num_winners = parseInt(e.target.value) })
                                }}
                            />
                            <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                                {errors.raceNumWinners}
                            </FormHelperText>
                        </Box>
                    </StepContent>
                </Step>

                <Step>
                    <StepButton onClick={() => setActiveStep(1)}>Voting Method</StepButton>
                    <StepContent>
                        <FormControl component="fieldset" variant="standard">
                            <RadioGroup
                                aria-labelledby="voting-method-radio-group"
                                name="voter-method-radio-buttons-group"
                                value={editedRace.voting_method}
                                onChange={(e) => applyRaceUpdate(race => { race.voting_method = e.target.value })}
                            >
                                <FormControlLabel value="STAR" control={<Radio />} label="STAR" sx={{ mb: 0, pb: 0 }} />
                                <FormHelperText sx={{ pl: 4, mt: -1 }}>
                                    Score candidates 0-5
                                </FormHelperText>

                                {flags.isSet('METHOD_STAR_PR') && <>
                                    <FormControlLabel value="STAR_PR" control={<Radio />} label="Proportional STAR" />
                                    <FormHelperText sx={{ pl: 4, mt: -1 }}>
                                        Score candidates 0-5
                                    </FormHelperText>
                                </>}

                                {flags.isSet('METHOD_RANKED_ROBIN') && <>
                                    <FormControlLabel value="RankedRobin" control={<Radio />} label="Ranked Robin" />
                                    <FormHelperText sx={{ pl: 4, mt: -1 }}>
                                        Rank candidates in order of preference
                                    </FormHelperText>
                                </>}

                                {flags.isSet('METHOD_APPROVAL') && <>
                                    <FormControlLabel value="Approval" control={<Radio />} label="Approval" />
                                    <FormHelperText sx={{ pl: 4, mt: -1 }}>
                                        Mark all candidates you approve of
                                    </FormHelperText>
                                </>}

                                <Box
                                    display='flex'
                                    justifyContent="left"
                                    alignItems="center"
                                    sx={{ width: '100%', ml: -1 }}>

                                    {!showsAllMethods &&
                                        <IconButton aria-label="Home" onClick={() => { setShowsAllMethods(true) }}>
                                            <ExpandMore />
                                        </IconButton>}
                                    {showsAllMethods &&
                                        <IconButton aria-label="Home" onClick={() => { setShowsAllMethods(false) }}>
                                            <ExpandLess />
                                        </IconButton>}
                                    <Typography variant="body1" >
                                        More Options
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    height: showsAllMethods? 0 : '163px', // copied the value from auto
                                    opacity: showsAllMethods? 0 : 1,
                                    overflow: 'hidden',
                                    transition: 'height .4s, opacity .7s',
                                }}
                                >
                                    <Box
                                        display='flex'
                                        justifyContent="left"
                                        alignItems="center"
                                        sx={{ width: '100%', pl: 4, mt: -1 }}>

                                        <FormHelperText >
                                            These voting methods do not guarantee every voter an equally powerful vote if there are more than two candidates.
                                        </FormHelperText>
                                    </Box>
                                    <FormControlLabel value="Plurality" control={<Radio />} label="Plurality" />
                                    <FormHelperText sx={{ pl: 4, mt: -1 }}>
                                        Mark one candidate only. Not recommended with more than 2 candidates.
                                    </FormHelperText>

                                    {flags.isSet('METHOD_RANKED_CHOICE') && <>
                                        <FormControlLabel value="IRV" control={<Radio />} label="Ranked Choice" />
                                        <FormHelperText sx={{ pl: 4, mt: -1 }}>
                                            Rank candidates in order of preference, only recommended for educational purposes
                                        </FormHelperText>
                                    </>}

                                    {flags.isSet('METHOD_RANKED_CHOICE') && <>
                                        <FormControlLabel value="STV" control={<Radio />} label="STV" />
                                        <FormHelperText sx={{ pl: 4, mt: -1 }}>
                                            Proportaionl Version of RCV
                                        </FormHelperText>
                                    </>}
                                </Box>
                            </RadioGroup>
                        </FormControl>
                    </StepContent>
                </Step>
            </Stepper>

            <Grid container sx={{ m: 0, p: 1 }} >
                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                    <Typography gutterBottom variant="h6" component="h6">
                        Candidates
                    </Typography>
                    <FormHelperText error sx={{ pl: 1, mt: -1 }}>
                        {errors.candidates}
                    </FormHelperText>
                </Grid>
            </Grid>
            <Stack spacing={2}>
                {
                    <SortableList
                        items={ephemeralCandidates}
                        identifierKey="candidate_id"
                        onChange={handleChangeCandidates}
                        renderItem={(candidate, index) => (
                            <SortableList.Item id={candidate.candidate_id}>
                                <CandidateForm
                                    key={candidate.candidate_id}
                                    onEditCandidate={(newCandidate) => onEditCandidate(newCandidate, index)}
                                    candidate={candidate}
                                    index={index}
                                    onDeleteCandidate={() => onDeleteCandidate(index)}
                                    disabled={ephemeralCandidates.length - 1 === index}
                                    inputRef={el => inputRefs.current[index] = el}
                                    onKeyDown={event => handleKeyDown(event, index)}/>
                            </SortableList.Item>
                        )}
                    />
                }
            </Stack>
        </>
    )
}
