import React, { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CandidateForm from "../Candidates/CandidateForm";
import TextField from "@mui/material/TextField";
import Typography from '@mui/material/Typography';
import { Box, FormHelperText, Stack } from "@mui/material";
import { useLocalState } from '../../util';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import { SortableList } from '~/components/DragAndDrop';
import { makeDefaultRace, RaceErrors, useEditRace } from './useEditRace';
import { makeUniqueIDSync, ID_PREFIXES, ID_LENGTHS, NOTA_ID, makeWriteInCandidateId, isWriteInCandidate } from '@equal-vote/star-vote-shared/utils/makeID';
import VotingMethodSelector from './VotingMethodSelector';
import useElection from '~/components/ElectionContextProvider';
import { SecondaryButton, PrimaryButton, FileDropBox, LinkButton, Tip, UtilityButton } from '~/components/styles';
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

export const RACE_FORM_GAP = 0;

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
                <Box sx={{ mt: 3, display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 1 }}>
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

        return [
            ...editedRace.candidates.filter(c => c.candidate_id !== NOTA_ID),
            { candidate_id: newId, candidate_name: '' },
            ...(editedRace.enable_write_in ? [{ candidate_id: makeWriteInCandidateId('Write-in'), candidate_name: 'Write-in' }] : []),
            ...editedRace.candidates.filter(c => c.candidate_id === NOTA_ID),
        ];
    }, [editedRace.candidates, editedRace.enable_write_in]);

    const onEditCandidate = useCallback((candidate, uiIndex) => {
        applyRaceUpdate(race => {
            if(uiIndex === newCandidateIndex){
                race.candidates.splice(newCandidateIndex, 0, candidate) // this could be a push, or if there's nota or write in then this would be an insert
            }else{
                // the uiIndexToActualIndex is unnecessary here since we know uiIndex and index will always match for this case, but I'm still adding the function for clarity
                race.candidates[uiIndexToActualIndex(uiIndex)] = candidate;
            }
        });

        setErrors((prev: RaceErrors) => ({ ...prev, candidates: ''}));
    }, [applyRaceUpdate, setErrors]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChangeCandidates = useCallback((newCandidateList: any[]) => {
        // removing the newCandidateIndex will update the ephemeral order to match the actual one
        newCandidateList.splice(newCandidateIndex, 1);
        // write-in is ephemeral (not in race.candidates), so strip it out too
        const writeInIdx = newCandidateList.findIndex(c => isWriteInCandidate(c.candidate_id));
        if(writeInIdx >= 0) newCandidateList.splice(writeInIdx, 1);
        applyRaceUpdate(race => {
            race.candidates = newCandidateList;
        });
    }, [applyRaceUpdate]);

    const onDeleteCandidate = useCallback((uiIndex) => {
        if(isWriteInCandidate(ephemeralCandidates[uiIndex]?.candidate_id ?? '')) {
            applyRaceUpdate(race => { race.enable_write_in = false; });
            return;
        }
        const index = uiIndexToActualIndex(uiIndex);
        if (editedRace.candidates.length < 2) {
            setErrors(prev => ({ ...prev, candidates: 'At least 2 candidates are required' }));
            return;
        }

        applyRaceUpdate(race => {
            race.candidates.splice(index, 1);
        });
    }, [editedRace.candidates.length, applyRaceUpdate, setErrors, ephemeralCandidates]);

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

    const candidateItems = election.state === 'draft' ? ephemeralCandidates : editedRace.candidates;

    // Write-in and NOTA are listed below the new candidate in the ephemeral list (write-in first)
    const numSpecialCandidates = editedRace.candidates.filter(c => c.candidate_id === NOTA_ID).length + (editedRace.enable_write_in ? 1 : 0);
    const newCandidateIndex = election.state === 'draft' ? ephemeralCandidates.length - 1 - numSpecialCandidates : undefined;

    const uiIndexToActualIndex = (uiIndex) => {
        // we only use the ephemeral list when we're in draft, otherwise the ui will match editedRace.candidates
        if(election.state != 'draft') return uiIndex;
        if(uiIndex === newCandidateIndex) throw "There is no mapping for the new candidate, this function shouldn't be used for that case"
        if(editedRace.enable_write_in && uiIndex === newCandidateIndex + 1) throw "There is no mapping for the write-in candidate, this function shouldn't be used for that case"
        // the ephemeral list has the new candidate slot plus an optional write-in slot before special candidates
        if(uiIndex > newCandidateIndex) return uiIndex - 1 - (editedRace.enable_write_in ? 1 : 0);
        return uiIndex;
    }

    const handlePhotoDrop = async (e) =>  {
        // load file data
        const names = []
        const promises = []
        // forEach doesn't exist on fileList type
        // I'm keeping the loops separate since all the files need to be retrieved from dataTransfer before any await functions are called
        for(let i = 0; i < e.dataTransfer.files.length; i++){ 
            const f = e.dataTransfer.files[i];

            const parts = f.name.split('\.');
            parts.pop(); // drop extension
            names.push(parts.join('.'))

            promises.push(getImage(URL.createObjectURL(f)).then(img => postImage(img)))
        }

        // get photos
        const photos = (await Promise.all(promises)).map(res => res.photo_filename);

        // create candidates
        const existingIds = new Set(editedRace.candidates.map(c => c.candidate_id));
        const newCandidates = names.map((n, i) => {
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


    const candidatesSection = <FileDropBox onlyShowOnDrag helperText={'Add from photo(s)'} onDrop={handlePhotoDrop}>
        <Typography variant='h6'>
            {t('race_form.candidates_title')}
        </Typography>
        <FormHelperText error sx={{ pl: 1, pt: 0 }}>
            {errors.candidates}
        </FormHelperText>

        <Stack>
            <SortableList
                items={candidateItems}
                identifierKey="candidate_id"
                indexIsValid={index => index < newCandidateIndex}
                onChange={handleChangeCandidates}
                renderItem={(candidate, index) => (
                    <SortableList.Item id={candidate.candidate_id}>
                        <CandidateForm
                            key={candidate.candidate_id}
                            onEditCandidate={(newCandidate) => onEditCandidate(newCandidate, index)}
                            candidate={candidate}
                            index={index}
                            onDeleteCandidate={() => onDeleteCandidate(index)}
                            disabled={election.state !== 'draft'}
                            special={index > newCandidateIndex}
                            inputRef={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
                            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(event, index)}
                            electionState={election.state} />
                    </SortableList.Item>
                )}
            />
            {election.state == 'draft' && !editedRace.enable_write_in && <Box>
                <UtilityButton
                    onClick={() => applyRaceUpdate((race) => { race.enable_write_in = true; })}
                    sx={{ml: 1}}
                >
                    + Add Write-in
                </UtilityButton>
            </Box>}
            {flags.isSet('NOTA') && election.state == 'draft' && !editedRace.candidates.some((c) => c.candidate_id === NOTA_ID) && <Box>
                <UtilityButton onClick={()=>{onEditCandidate({
                    candidate_id: NOTA_ID,
                    candidate_name: 'None of the Above',
                }, newCandidateIndex)}} sx={{ml: 1}}>
                    + Add "None of the Above"
                </UtilityButton>
                <Tip name='nota'/>
            </Box>}
        </Stack>
    </FileDropBox>;

    return <Box sx={{ textAlign: 'left', display: "flex", flexDirection: "column", alignItems: "stretch", gap: RACE_FORM_GAP }}>
        <TitleAndDescription setErrors={setErrors} errors={errors} editedRace={editedRace} applyRaceUpdate={applyRaceUpdate} open={open}/>

        {candidatesSection}
        <VotingMethodSelector election={election} editedRace={editedRace} isDisabled={isDisabled} setErrors={setErrors} errors={errors} applyRaceUpdate={applyRaceUpdate} open={open}/>
    </Box>
}

const TitleAndDescription = ({setErrors, errors, editedRace, applyRaceUpdate, open}) => {
    const [showDescription, setShowDescription] = useState(!!editedRace.description);
    const { election, t } = useElection()
    const isDisabled = election.state !== 'draft';

    const [localTitle, setLocalTitle, flushTitle] = useLocalState(
        editedRace.title,
        v => applyRaceUpdate(race => { race.title = v })
    );
    const [localDesc, setLocalDesc, flushDesc] = useLocalState(
        editedRace.description,
        v => applyRaceUpdate(race => { race.description = v })
    );

    useEffect(() => {
        setShowDescription(!!editedRace.description)
    }, [open])

    return <>
        <Typography variant='h6'>{t('wizard.title_label')}</Typography>
        <Box>
            <TextField
                id={`race-title`}
                disabled={isDisabled}
                name="title"
                label={t('wizard.title_label')}
                type="text"
                error={errors.raceTitle !== ''}
                value={localTitle}
                sx={{
                    m: 0,
                    boxShadow: 2,
                }}
                fullWidth
                onChange={(e) => {
                    if (errors.raceTitle) setErrors({ ...errors, raceTitle: '' })
                    setLocalTitle(e.target.value)
                }}
                onBlur={flushTitle}
            />
            <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                {errors.raceTitle}
            </FormHelperText>
        </Box>

        <Box>
            <UtilityButton onClick={() => setShowDescription(d => !d)}>
                {showDescription? '-' : '+'} Description (Optional)
            </UtilityButton>
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
                    value={localDesc}
                    minRows={3}
                    sx={{
                        m: 0,
                        boxShadow: 2,
                    }}
                    onChange={(e) => {
                        if (errors.raceDescription) setErrors({ ...errors, raceDescription: '' })
                        setLocalDesc(e.target.value)
                    }}
                    onBlur={flushDesc}
                />
                <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                    {errors.raceDescription}
                </FormHelperText>
            </>}
        </Box>
    </>
}