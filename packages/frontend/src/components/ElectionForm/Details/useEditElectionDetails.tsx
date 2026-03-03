import { useState, useEffect } from "react"
import { DateTime } from 'luxon'
import useElection from '../../ElectionContextProvider';
import { isValidDate } from '../../util';
import structuredClone from '@ungap/structured-clone';

export const dateToLocalLuxonDate = (date: Date | string | null | undefined, timeZone: string) => {
    // NOTE: we don't want to use the util function here since we want to omit the timezone

    // Converts either string date or date object to ISO string in input time zone
    if (date == null || date == '') return ''
    date = new Date(date)
    // Convert to luxon date and apply time zone offset, then convert to ISO string for input component
    return DateTime.fromJSDate(date)
        .setZone(timeZone)
        .startOf("minute")
        .toISO({ includeOffset: false, suppressSeconds: true, suppressMilliseconds: true })
}

export const useEditElectionDetails = () => {
    const { election, refreshElection, updateElection } = useElection()


    const [editedElection, setEditedElection] = useState(election)

    const [errors, setErrors] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
    })

    // Sync editedElection state when the election context changes
    useEffect(() => {
        setEditedElection(election)
        setErrors({
            title: '',
            description: '',
            startTime: '',
            endTime: '',
        })
    }, [election.election_id])

    const applyUpdate = (updateFunc: (settings) => void) => {
        const settingsCopy = structuredClone(editedElection)
        updateFunc(settingsCopy)
        setEditedElection(settingsCopy)
    };




    const validatePage = () => {
        let isValid = 1
        const newErrors = { ...errors }

        if (!editedElection.title) {
            newErrors.title = 'Election title required';
            isValid = 0;
        }
        else if (editedElection.title.length < 3 || editedElection.title.length > 256) {
            newErrors.title = 'Election title must be between 3 and 256 characters';
            isValid = 0;
        }
        if (editedElection.description && editedElection.description.length > 1000) {
            newErrors.description = 'Description must be less than 1000 characters';
            isValid = 0;
        }
        if (editedElection.start_time) {
            if (!isValidDate(editedElection.start_time)) {
                newErrors.startTime = 'Invalid date';
                isValid = 0;
            }
        }

        if (editedElection.end_time) {
            if (!isValidDate(editedElection.end_time)) {
                newErrors.endTime = 'Invalid date';
                isValid = 0;
            }
            else if (editedElection.end_time < new Date()) {
                newErrors.endTime = 'Start date must be in the future';
                isValid = 0;
            }
            else if (editedElection.start_time && newErrors.startTime === '') {
                // If start date exists, has no errors, and is after the end date
                if (editedElection.start_time >= editedElection.end_time) {
                    newErrors.endTime = 'End date must be after the start date';
                    isValid = 0;
                }
            }
        }
        setErrors(errors => ({ ...errors, ...newErrors }))
        return isValid
    }

    const onSave = async () => {
        if (!validatePage()) {
            return
        }

        const success = await updateElection(election => {
            election.title = editedElection.title
            election.description = editedElection.description
            election.start_time = editedElection.start_time
            election.end_time = editedElection.end_time
            election.settings.time_zone = editedElection.settings.time_zone
        })

        if (!success) return
        await refreshElection()
        return true
    }

    return { editedElection, applyUpdate, validatePage, onSave, errors, setErrors }
}