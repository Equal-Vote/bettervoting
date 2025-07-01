import React, { Dispatch, useCallback, useMemo, useRef } from 'react'
import { useState } from "react"
import { CandidateForm } from "../Candidates/AddCandidate"
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from '@mui/material/Typography';
import { Box, FormHelperText, Radio, RadioGroup, Stack, Step, StepButton, StepContent, Stepper } from "@mui/material"
import IconButton from '@mui/material/IconButton'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { methodValueToTextKey, useSubstitutedTranslation } from '../../util';
import useElection from '../../ElectionContextProvider';
import useConfirm from '../../ConfirmationDialogProvider';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import { SortableList } from '~/components/DragAndDrop';
import { NewRace } from './Race';
import { RaceErrors } from './useEditRace';
import { makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

interface RaceFormProps {
    race_index: number;
    editedRace: NewRace;
    errors: RaceErrors;
    setErrors: Dispatch<React.SetStateAction<RaceErrors>>;
    applyRaceUpdate: (update: (race: NewRace) => void) => void;
    activeStep: number;
    setActiveStep: (step: number) => void;
}

export default function RaceForm({
  race_index, editedRace, errors, setErrors, applyRaceUpdate,
  activeStep, setActiveStep
}: RaceFormProps) {
    const {t} = useSubstitutedTranslation();
    const flags = useFeatureFlags();
    const [showsAllMethods, setShowsAllMethods] = useState(false)
    const { election } = useElection()
    const PR_METHODS = ['STV', 'STAR_PR'];
    const isDisabled = election.state !== 'draft';
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
    const ephemeralCandidates = useMemo(() => {
        // Get all existing candidate IDs
        const existingIds = new Set(editedRace.candidates.map(c => c.candidate_id));
        
        const hasCollision = (id: string) => existingIds.has(id);
        
        const newId = makeUniqueIDSync(
            ID_PREFIXES.CANDIDATE, 
            ID_LENGTHS.CANDIDATE,
            hasCollision
        );
        
        return [...editedRace.candidates, { 
            candidate_id: newId, 
            candidate_name: '' 
        }];
    }, [editedRace.candidates]);

    const onEditCandidate = useCallback((candidate, index) => {
        applyRaceUpdate(race => {
            if (race.candidates[index]) {
                race.candidates[index] = candidate;
            } else {
                race.candidates.push(candidate);
            }
        });

        setErrors((prev: RaceErrors) => ({ ...prev, candidates: '', raceNumWinners: '' }));
    }, [applyRaceUpdate, setErrors]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        const target = event.target as HTMLInputElement;
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
        } else if (event.key === 'Backspace' && target.value === '' && index > 0) {
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

    const MethodBullet = ({value, disabled}: {value: string, disabled: boolean}) => <>
        <FormControlLabel value={value} disabled={disabled} control={<Radio />} label={t(`edit_race.methods.${methodValueToTextKey[value]}.title`)} sx={{ mb: 0, pb: 0 }} />
        <FormHelperText sx={{ pl: 4, mt: -1 }}>
            {t(`edit_race.methods.${methodValueToTextKey[value]}.description`)}
        </FormHelperText>
    </>

    return (
        <>
            <Grid container sx={{ m: 0, p: 1 }} >
                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                    <TextField
                        id={`race-title-${String(race_index)}`}
                        disabled={isDisabled}
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
                        label="Race Description"
                        disabled={isDisabled}
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
                            disabled={isDisabled}
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
                    <StepButton aria-label='Method Family' onClick={() => setActiveStep(0)}>
                        {t('edit_race.how_many_winners')}
                        &nbsp;
                        {editedRace.num_winners == 1 ?
                            <b>{t(`edit_race.${methodFamily}`)}</b> :
                            t('edit_race.count_with_family', {
                                count: editedRace.num_winners,
                                // .props.children[0] is a hack to remove the tip and parse out the string
                                family: (typeof t(`edit_race.${methodFamily}`) == 'string') ?
                                    t(`edit_race.${methodFamily}`) :
                                    t(`edit_race.${methodFamily}`).props.children[0]
                            })
                        }
                    </StepButton>
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
                            <FormControlLabel
                                value="single_winner"
                                disabled= {isDisabled}
                                control={<Radio />}
                                label={t('edit_race.single_winner')}
                                sx={{ mb: 0, pb: 0 }}
                                onClick={() => {
                                    applyRaceUpdate(race => {
                                        if(PR_METHODS.includes(race.voting_method)) race.voting_method = '';
                                        race.num_winners = 1
                                    })
                                }}
                            />
                            <FormControlLabel
                                value="bloc_multi_winner"
                                disabled= {isDisabled}
                                control={<Radio />}
                                label={t('edit_race.bloc_multi_winner')}
                                sx={{ mb: 0, pb: 0 }}
                                onClick={() => {
                                    applyRaceUpdate(race => {
                                        if(PR_METHODS.includes(race.voting_method)) race.voting_method = '';
                                        race.num_winners = Math.max(2, race.num_winners)
                                    })
                                }}
                            />
                            <FormControlLabel
                                value="proportional_multi_winner"
                                disabled= {isDisabled}
                                control={<Radio />}
                                label={t('edit_race.proportional_multi_winner')}
                                sx={{ mb: 0, pb: 0 }}
                                onClick={() => {
                                    applyRaceUpdate(race => {
                                        if(!PR_METHODS.includes(race.voting_method)) race.voting_method = '';
                                        race.num_winners = Math.max(2, race.num_winners)
                                    })
                                }}
                            />
                        </RadioGroup>
                        <Box sx={{
                            height: methodFamily == 'single_winner' ? 0 : '105px', // copied from the value for auto
                            opacity: methodFamily == 'single_winner' ? 0 : 1,
                            overflow: 'hidden',
                            transition: 'height .4s, opacity .7s',
                            maxWidth: '300px'
                        }}>
                            <Typography id="num-winners-label" gutterBottom component="p" sx={{marginTop: 2}}>
                                <b>{t('edit_race.number_of_winners')}</b>
                            </Typography>
                            <TextField
                                id={`num-winners-${String(race_index)}`}
                                type="number"
                                InputProps={{
                                    inputProps: { 
                                        min: 2,
                                        "aria-labelledby": "num-winners-label",
                                    }
                                }}
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
                    <StepButton onClick={() => setActiveStep(1)}>
                        {t('edit_race.which_voting_method')}
                        &nbsp;
                        <b>{editedRace.voting_method != '' && t(`methods.${methodValueToTextKey[editedRace.voting_method]}.full_name`)}</b>
                    </StepButton>
                    <StepContent>
                        <FormControl component="fieldset" variant="standard">
                            <RadioGroup
                                aria-labelledby="voting-method-radio-group"
                                
                                name="voter-method-radio-buttons-group"
                                value={editedRace.voting_method}
                                onChange={(e) => applyRaceUpdate(race => { race.voting_method = e.target.value as NewRace['voting_method'] })}
                                
                            >
                                {methodFamily == 'proportional_multi_winner' ?
                                    <MethodBullet value='STAR_PR' disabled={isDisabled}/>
                                : <>
                                    <MethodBullet value='STAR' disabled={isDisabled}/>
                                    <MethodBullet value='RankedRobin' disabled={isDisabled}/>
                                    <MethodBullet value='Approval' disabled={isDisabled}/>
                                </>}

                                <Box
                                    display='flex'
                                    justifyContent="left"
                                    alignItems="center"
                                    sx={{ width: '100%', ml: -1 }}>

                                    {!showsAllMethods &&
                                        <IconButton aria-labelledby='more-options' disabled={election.state != 'draft'} onClick={() => { setShowsAllMethods(true) }}>
                                            <ExpandMore />
                                        </IconButton>}
                                    {showsAllMethods &&
                                        <IconButton aria-label='more-options'disabled={election.state != 'draft'} onClick={() => { setShowsAllMethods(false) }}>
                                            <ExpandLess />
                                        </IconButton>}
                                    <Typography variant="body1" id={'more-options'} >
                                        More Options
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    height: showsAllMethods? 0 : 'auto',
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


                                    {methodFamily == 'proportional_multi_winner' ?
                                        <MethodBullet value='STV' disabled={isDisabled}/>
                                    : <>
                                        <MethodBullet value='Plurality' disabled={isDisabled}/>
                                        <MethodBullet value='IRV' disabled={isDisabled}/>
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
                        items={election.state === 'draft' ? ephemeralCandidates : editedRace.candidates}
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
                                    disabled={ephemeralCandidates.length - 1 === index || election.state !== 'draft'}
                                    inputRef={(el:React.MutableRefObject<HTMLInputElement[]>) => inputRefs.current[index] = el}
                                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(event, index)}
                                    electionState={election.state}/>
                            </SortableList.Item>
                        )}
                    />
                }
            </Stack>
        </>
    )
}
