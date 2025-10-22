import { Dispatch, useEffect } from 'react'
import { useState } from "react"

import { scrollToElement } from '../../util';
import useElection, { IElectionContext } from '../../ElectionContextProvider';
import { Race as iRace } from '@equal-vote/star-vote-shared/domain_model/Race';
import structuredClone from '@ungap/structured-clone';
import useConfirm from '../../ConfirmationDialogProvider';
import { Election as IElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import { makeID, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';
import { Candidate } from '@equal-vote/star-vote-shared/domain_model/Candidate';
import { useDeleteAllBallots } from '~/hooks/useAPI';
import useSnackbar from '~/components/SnackbarContext';
import { Election, NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';

export interface RaceErrors {
    raceTitle?: string,
    raceDescription?: string,
    raceNumWinners?: string,
    candidates?: string
}

export const makeDefaultRace = () => ({
    title: '',
    description: '',
    race_id: '',
    num_winners: undefined,
    voting_method: undefined,
    candidates: [
        { 
            candidate_id: makeID(ID_PREFIXES.CANDIDATE, ID_LENGTHS.CANDIDATE),
            candidate_name: ''
        },
    ] as Candidate[],
    precincts: undefined,
} as iRace);

export const useEditRace = (
    race: iRace | null,
    race_index: number,
    draftMode=true,
) => {
    const { election, refreshElection, updateElection } = useElection()
    const { setSnack } = useSnackbar()
    //const { makeRequest: deleteAllBallots } = useDeleteAllBallots(election.election_id);
    const confirm = useConfirm();
    
    const [editedRace, setEditedRace] = useState(race !== null ? race : makeDefaultRace())

    const [errors, setErrors] = useState({
        raceTitle: '',
        raceDescription: '',
        raceNumWinners: '',
        candidates: ''
    } as RaceErrors)

    useEffect(() => {
        setEditedRace(race !== null ? race : makeDefaultRace())
        setErrors({
            raceTitle: '',
            raceDescription: '',
            raceNumWinners: '',
            candidates: ''
        })
    }, [race, race_index])

    const applyRaceUpdate = (updateFunc: (race: iRace) => void) => {
        const raceCopy: iRace = structuredClone(editedRace)
        updateFunc(raceCopy)
        setEditedRace(raceCopy)
        if(!draftMode){
            updateElection(election => {
                if (race_index !== undefined) {
                    election.races[race_index] = raceCopy
                }
            });
            //TODO: make sure this works, we want the "same as previous title" checkbox to work
        }
    };

    const validateRace = () => {
        let isValid = true
        const newErrors: RaceErrors = {}

        if (!editedRace.title) {
            newErrors.raceTitle = 'Race title required';
            isValid = false;
        }
        else if (editedRace.title.length < 3 || editedRace.title.length > 256) {
            newErrors.raceTitle = 'Race title must be between 3 and 256 characters';
            isValid = false;
        }
        if (editedRace.description && editedRace.description.length > 1000) {
            newErrors.raceDescription = 'Race title must be less than 1000 characters';
            isValid = false;
        }
        if (election.races.some(race => {
            // Check if the race ID is the same
            if (race.race_id != editedRace.race_id) {
                // Check if the title is the same
                if (race.title === editedRace.title) return true;
                return false;
            }
        })) {
            newErrors.raceTitle = 'Races must have unique titles';
            isValid = false;
        }
        
        if (editedRace.num_winners < 1) {
            setSnack({
                message: 'Must have at least one winner',
                severity: 'warning',
                open: true,
                autoHideDuration: 6000,
            })
            isValid = false;
        }

        // if (editedRace.voting_method == '') {
        //     setSnack({
        //         message: 'Must select a voting method',
        //         severity: 'warning',
        //         open: true,
        //         autoHideDuration: 6000,
        //     })
        //     isValid = false;
        // }
        const numCandidates = editedRace.candidates.filter(candidate => candidate.candidate_name !== '').length
        if (editedRace.num_winners > numCandidates) {
            newErrors.raceNumWinners = 'Cannot have more winners than candidates';
            isValid = false;
        }
        if (numCandidates < 2) {
            newErrors.candidates = 'Must have at least 2 candidates';
            isValid = false;
        }
        const uniqueCandidates = new Set(editedRace.candidates.filter(candidate => candidate.candidate_name !== '').map(candidate => candidate.candidate_name))
        if (numCandidates !== uniqueCandidates.size) {
            newErrors.candidates = 'Candidates must have unique names';
            isValid = false;
        }
        // Check if any candidates are empty
        if (editedRace.candidates.some(candidate => candidate.candidate_name === '')) {
            newErrors.candidates = 'Candidates must have names';
            isValid = false;
        }
        setErrors(errors => ({ ...errors, ...newErrors }))

        // NOTE: I'm passing the element as a function so that we can delay the query until the elements have been updated
        scrollToElement(() => document.querySelectorAll('.Mui-error'))

        return isValid
    }

    // TODO: Add these where they're needed
    //const onDuplicateRace = async () => {
    //    if (!validateRace()) return false
    //    let success = await updateElection(election => {
    //        election.races.push({
    //            ...editedRace,
    //            title: 'Copy Of ' + editedRace.title,
    //            race_id: makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE)
    //        })
    //    })
    //    success = success && await deleteAllBallots()
    //    if (!success) return false
    //    await refreshElection()
    //    return true
    //}

    //const onSaveRace = async () => {
    //    if (!validateRace()) return false
    //    let success = await updateElection(election => {
    //        election.races[race_index] = editedRace
    //    })
    //    success = success && await deleteAllBallots()
    //    if (!success) return false
    //    await refreshElection()
    //    return true
    //}

    //const onDeleteRace = async () => {
    //    const confirmed = await confirm({ title: 'Confirm', message: 'Are you sure?' })
    //    if (!confirmed) return false
    //    let success = await updateElection(election => {
    //        election.races.splice(race_index, 1)
    //    })
    //    success = success && await deleteAllBallots()
    //    if (!success) return false
    //    await refreshElection()
    //    return true
    //}

    return { editedRace, setEditedRace, errors, setErrors, applyRaceUpdate, /*onSaveRace, onDeleteRace, onDuplicateRace,*/ validateRace }
}