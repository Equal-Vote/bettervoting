import React, { Dispatch, useCallback, useMemo, useRef, useState } from 'react';
import CandidateForm from "../Candidates/CandidateForm";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from '@mui/material/Typography';
import { Button, FormHelperText, Stack } from "@mui/material";
import { useSubstitutedTranslation } from '../../util';
import useConfirm from '../../ConfirmationDialogProvider';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import { SortableList } from '~/components/DragAndDrop';
import { NewRace } from './Race';
import { RaceErrors, useEditRace } from './useEditRace';
import { makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';
import { Election, NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import VotingMethodSelector from './VotingMethodSelector';
import useElection from '~/components/ElectionContextProvider';

interface RaceFormProps {
    raceIndex?: number,
}

const TitleAndDescription = ({isDisabled, election, setErrors, errors, editedRace, applyRaceUpdate}) => {
    const [showDescription, setShowDescription] = useState(false);
    return <>
        <Grid item xs={12} sx={{ m: 0, p: 1 }}>
            <TextField
                id={`race-title`}
                disabled={isDisabled}
                name="title"
                label={election.settings.term_type == 'poll' ? 'Poll Question' : 'Elected Office Title'}
                type="text"
                error={errors.raceTitle !== ''}
                value={editedRace.title}
                sx={{
                    m: 0,
                    boxShadow: 2,
                }}
                fullWidth
                onChange={(e) => {
                    //setErrors({ ...errors, raceTitle: '' })
                    applyRaceUpdate(race => { race.title = e.target.value })
                }}
            />
            <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                {errors.raceTitle}
            </FormHelperText>
        </Grid>

        {showDescription && <Grid item xs={12} sx={{ m: 0, p: 1 }}>
            <TextField
                id={`race-description`}
                name="description"
                label="Description"
                disabled={isDisabled}
                multiline
                fullWidth
                type="text"
                error={errors.raceDescription !== ''}
                value={editedRace.description}
                minRows={3}
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
        </Grid>}
        <Button
            sx={{textDecoration: 'none', color: 'gray'}}
            onClick={() => setShowDescription(d => !d)}
        >
            {showDescription? 'Hide Description' : '+ Add Description'}
        </Button>
    </>
}

export default function RaceForm({
    raceIndex=undefined,
}: RaceFormProps) {
    const flags = useFeatureFlags();
    const { election } = useElection()
    const { t } = useSubstitutedTranslation();
    const isDisabled = election.state !== 'draft';
    const { editedRace, errors, setErrors, applyRaceUpdate} = useEditRace(
        raceIndex == undefined ? null : election.races[raceIndex],
        0,
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

    const Precincts = () => <>
        <Grid item xs={12}>
            <TextField
                id={`race-precincts`}
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
                    race.precincts = e.target.value ? e.target.value.split('\n') : undefined;
                })}
            />
        </Grid>
    </>

    return (
        <>
            <Grid container sx={{ m: 0, p: 1 }} >
                <TitleAndDescription isDisabled={isDisabled} election={election} setErrors={setErrors} errors={errors} editedRace={editedRace} applyRaceUpdate={applyRaceUpdate} />
                {flags.isSet('PRECINCTS') && election.settings.voter_access !== 'open' && <Precincts/>}
            </Grid>

            <VotingMethodSelector election={election} editedRace={editedRace} isDisabled={isDisabled} setErrors={setErrors} errors={errors} applyRaceUpdate={applyRaceUpdate} />

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
                                    disabled={ephemeralCandidates.length - 1 === index || isDisabled}
                                    inputRef={(el: React.MutableRefObject<HTMLInputElement[]>) => inputRefs.current[index] = el}
                                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(event, index)}
                                    electionState={election.state} />
                            </SortableList.Item>
                        )}
                    />
                }
            </Stack>
        </>
    )
}