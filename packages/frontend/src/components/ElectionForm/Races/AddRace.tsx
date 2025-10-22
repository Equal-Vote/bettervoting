import { useState } from 'react'
import { Box } from "@mui/material"
import { PrimaryButton } from '../../styles';
import useElection from '../../ElectionContextProvider';
import RaceDialog from './RaceDialog';
import RaceForm from './RaceForm';
import { makeDefaultRace, useEditRace } from './useEditRace';
import { ID_LENGTHS, ID_PREFIXES, makeID } from '@equal-vote/star-vote-shared/utils/makeID';
import { useDeleteAllBallots } from '~/hooks/useAPI';

export default function AddRace() {
    const { election, updateElection, refreshElection } = useElection()
    const { makeRequest: deleteAllBallots } = useDeleteAllBallots(election.election_id);

    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const [activeStep, setActiveStep] = useState(0);
    const resetStep = () => setActiveStep(0);

    //const { editedRace, setEditedRace, errors, setErrors, applyRaceUpdate, validateRace } = useEditRace(null, election.races.length)

    const onAdd = async () => {
        const success = await onAddRace()
        if (!success) return
        handleClose()
    }

    const onAddRace = async () => {
        if (!validateRace()) return false
        let success = await updateElection(election => {
            election.races.push({
                ...editedRace,
                race_id: makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE)
            })
        })
        success = success && await deleteAllBallots()
        if (!success) return false
        await refreshElection()
        setEditedRace(makeDefaultRace())
        return true
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'row'
        }}>
            <PrimaryButton
                onClick={handleOpen}
                disabled={election.state!=='draft'}>
                Add Race
            </PrimaryButton>
            <RaceDialog
              onSaveRace={onAdd}
              open={open}
              handleClose={handleClose}
              resetStep={resetStep}
            >
                <RaceForm
                    raceIndex={election.races.length}
                    //editedRace={editedRace}
                    //errors={errors}
                    //setErrors={setErrors}
                    //applyRaceUpdate={applyRaceUpdate}
                    //activeStep={activeStep}
                    //setActiveStep={setActiveStep}
                />
            </RaceDialog>
        </Box>
    )
}
