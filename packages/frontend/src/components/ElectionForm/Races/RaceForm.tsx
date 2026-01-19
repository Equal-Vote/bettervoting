import React, { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CandidateForm from "../Candidates/CandidateForm";
import TextField from "@mui/material/TextField";
import Typography from '@mui/material/Typography';
import { Box, Button, FormHelperText, Stack } from "@mui/material";
import { AddIcon, MinusIcon, TransitionBox, useSubstitutedTranslation } from '../../util';
import useConfirm from '../../ConfirmationDialogProvider';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import { SortableList } from '~/components/DragAndDrop';
import { makeDefaultRace, RaceErrors, useEditRace } from './useEditRace';
import { makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';
import VotingMethodSelector from './VotingMethodSelector';
import useElection from '~/components/ElectionContextProvider';
import { SecondaryButton, PrimaryButton, FileDropBox } from '~/components/styles';
import RaceDialog from './RaceDialog';
import { Candidate } from '@equal-vote/star-vote-shared/domain_model/Candidate';
import { getImage, postImage } from '../Candidates/PhotoUtil';

interface RaceFormProps {
    raceIndex?: number,
    styling: 'Wizard' | 'Dialog',
    onConfirm?: Function,
    onCancel?: Function,
    dialogOpen?: boolean,
}

export const RACE_FORM_GAP = 2;

export default function RaceForm({
    raceIndex=undefined,
    styling,
    onConfirm=() => {},
    onCancel=() => {},
    dialogOpen=undefined,
}: RaceFormProps) {
    const {election} = useElection();
    const editRace = useEditRace(
        raceIndex == undefined ? null : election.races[raceIndex],
        0,
        dialogOpen,
    )

    return (
        <>
            {styling == 'Dialog' &&
                <RaceDialog
                    onSaveRace={() => editRace.validateRace() && onConfirm(editRace.editedRace)}
                    open={dialogOpen}
                    handleClose={() => onCancel()}
                >
                    {/* I can't absorb it into FormComponent because of Component Identity Instability*/}
                    <Box sx={{width: {xs: '250px', sm: '500px'}, padding: 1, minHeight: '500px'}}>
                        <InnerRaceForm {...editRace} open={dialogOpen}/>
                    </Box>
                </RaceDialog>
            }
            {styling == 'Wizard' && <>
                <InnerRaceForm {...editRace}/>
                <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1} sx={{mt: 3}}>
                    <PrimaryButton onClick={() => editRace.validateRace() && onConfirm(editRace.editedRace)}>Next</PrimaryButton>
                </Box>
            </>}
        </>
    )
}

const InnerRaceForm = ({setErrors, errors, editedRace, applyRaceUpdate, open=true}) => {
    const flags = useFeatureFlags();
    const { election, t } = useElection()
    const isDisabled = election.state !== 'draft';
    const [] = useState(false);

    // Dialog should default to candidates being expanded, Wizard should not
    const [candidatesExpaneded, setCandidatesExpanded] = useState(editedRace.candidates.length > 0);

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

        setErrors((prev: RaceErrors) => ({ ...prev, candidates: ''}));
    }, [applyRaceUpdate, setErrors]);

    useEffect(() => {
        setCandidatesExpanded(editedRace.candidates.length > 1)
    }, [open])
    
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
            })
        }
    }, [ephemeralCandidates.length, applyRaceUpdate]);

    const Precincts = () => <>
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
    </>

    let candidateItems = election.state === 'draft' ? ephemeralCandidates : editedRace.candidates;

    const saveImage = async (photoFile) => {
        //const image = await getImage(photoFile);
        //await postImage(image)
    }

    const handlePhotoDrop = async (e) =>  {
        console.log(e.dataTransfer.files)
        // load file data
        let names = []
        let promises = []
        // forEach doesn't exist on fileList type
        // I'm keeping the loops separate since all the files need to be retrieved from dataTransfer before any await functions are called
        for(let i = 0; i < e.dataTransfer.files.length; i++){ 
            let f = e.dataTransfer.files[i];

            let parts = f.name.split('\.');
            parts.pop(); // drop extension
            names.push(parts.join('.'))

            promises.push(getImage(URL.createObjectURL(f)).then(img => postImage(img)))
        }

        // get photos
        let photos = (await Promise.all(promises)).map(res => res.photo_filename);

        // create candidates
        const existingIds = new Set(editedRace.candidates.map(c => c.candidate_id));
        let newCandidates = names.map((n, i) => {
            const hasCollision = (id: string) => existingIds.has(id);

            const newId = makeUniqueIDSync(
                ID_PREFIXES.CANDIDATE,
                ID_LENGTHS.CANDIDATE,
                hasCollision
            );

            return {
                candidate_id: newId,
                candidate_name: names[i],
                photo_filename: photos[i],
            } as Candidate;
        })

        // I can't use onEditCandidate since it can't be called multiple times
        applyRaceUpdate(race => {
            if(race.candidates.length == 1 && race.candidates[0].candidate_name == '') race.candidates.pop();
            newCandidates.forEach(c => race.candidates.push(c))
        });
    }

    return <Box display='flex' flexDirection='column' alignItems='stretch' gap={RACE_FORM_GAP} sx={{textAlign: 'left'}}>
        <TitleAndDescription setErrors={setErrors} errors={errors} editedRace={editedRace} applyRaceUpdate={applyRaceUpdate} open={open}/>

        <VotingMethodSelector election={election} editedRace={editedRace} isDisabled={isDisabled} setErrors={setErrors} errors={errors} applyRaceUpdate={applyRaceUpdate} />

        <FileDropBox onlyShowOnDrag helperText={'Add from photo(s)'} onDrop={handlePhotoDrop}>
            <Button
                // it's hacky, but opacity 0.8 does helps take the edge off the bold a bit
                sx={{mr: "auto", textDecoration: 'none', textTransform: 'none', color: 'black', fontSize: '1.125rem', opacity: 0.86}}
                onClick={() => setCandidatesExpanded((e) => !e)}
            >
                {candidatesExpaneded? <MinusIcon prefix/> :<AddIcon prefix/>} {t('race_form.candidates_title')}
            </Button>
            <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                {errors.candidates}
            </FormHelperText>

            <Box sx={{
                position: 'relative',
                height: candidatesExpaneded? `${candidateItems.length*66 - 11}px` : 0,
                transition: 'height 0.5s',
            }}>
                <TransitionBox absolute enabled={candidatesExpaneded}>
                    <Stack spacing={2}>
                        <SortableList
                            items={candidateItems}
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
                                        inputRef={(el: React.MutableRefObject<HTMLInputElement[]>) => inputRefs.current[index] = el}
                                        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(event, index)}
                                        electionState={election.state} />
                                </SortableList.Item>
                            )}
                        />
                    </Stack>
                </TransitionBox>
            </Box>
        </FileDropBox>
    </Box>
}

const TitleAndDescription = ({setErrors, errors, editedRace, applyRaceUpdate, open}) => {
    const [showDescription, setShowDescription] = useState(editedRace.description != '');
    const { election, t } = useElection()
    const isDisabled = election.state !== 'draft';

    useEffect(() => {
        setShowDescription(editedRace.description == '')
    }, [open])

    return <>
        <Box>
            <TextField
                id={`race-title`}
                disabled={isDisabled}
                name="title"
                label={t('wizard.title_label')}
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
                }}
            />
            <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                {errors.raceTitle}
            </FormHelperText>
        </Box>

        <Box>
            <Button
                sx={{textDecoration: 'none', textTransform: 'none', color: 'black', fontSize: '1.125rem', opacity: 0.86}}
                onClick={() => setShowDescription(d => !d)}
            >
                {showDescription? <MinusIcon prefix/> : <AddIcon prefix/>} Description (Optional)
            </Button>
            {showDescription && <>
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
            </>}
        </Box>
    </>
}