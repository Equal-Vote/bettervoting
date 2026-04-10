import { useEffect, useState } from "react"

import { scrollToElement } from '../../util';
import useElection from '../../ElectionContextProvider';
import { Race as iRace } from '@equal-vote/star-vote-shared/domain_model/Race';
import { makeID, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';
import { Candidate } from '@equal-vote/star-vote-shared/domain_model/Candidate';

export interface RaceErrors {
    raceTitle?: string,
    raceDescription?: string,
    candidates?: string
    votingMethod?: string,
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
    open=false,
) => {
    const { election } = useElection()

    const getEmptyErrors = (): RaceErrors => ({
        raceTitle: '',
        raceDescription: '',
        candidates: '',
        votingMethod: '',
    });
    const [errors, setErrors] = useState<RaceErrors>(getEmptyErrors())

    useEffect(() => {
        setErrors(getEmptyErrors())
    }, [race, race_index, open])

    const validateRace = (editedRace: iRace) => {
        let isValid = true
        const newErrors: RaceErrors = {}

        if (!editedRace.title) {
            newErrors.raceTitle = 'Title required';
            isValid = false;
        }
        else if (editedRace.title.length < 3 || editedRace.title.length > 256) {
            newErrors.raceTitle = 'Title must be between 3 and 256 characters';
            isValid = false;
        }
        if (editedRace.description && editedRace.description.length > 1000) {
            newErrors.raceDescription = 'Description must be less than 1000 characters';
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
        
        if (editedRace.voting_method === undefined) {
            newErrors.votingMethod = 'Must select a voting method'
            isValid = false;
        }        

        const numCandidates = editedRace.candidates.filter(candidate => candidate.candidate_name !== '').length
        const uniqueCandidates = new Set(editedRace.candidates.filter(candidate => candidate.candidate_name !== '').map(candidate => candidate.candidate_name))
        if (numCandidates < 2 && !editedRace.enable_write_in) {
            newErrors.candidates = 'Must have at least 2 candidates';
            isValid = false;
        }else if (editedRace.num_winners > numCandidates) {
            newErrors.candidates = 'Cannot have more winners than candidates';
            isValid = false;
        }else if (numCandidates !== uniqueCandidates.size) {
            newErrors.candidates = 'Candidates must have unique names';
            isValid = false;
        }else if (editedRace.candidates.some(candidate => candidate.candidate_name === '')) {
            newErrors.candidates = 'Candidates must have names';
            isValid = false;
        }

        setErrors({
            ...getEmptyErrors(),
            ...newErrors,
        })

        // NOTE: I'm passing the element as a function so that we can delay the query until the elements have been updated
        scrollToElement(() => document.querySelectorAll('.Mui-error'))

        return isValid
    }

    return { errors, setErrors, validateRace }
}
