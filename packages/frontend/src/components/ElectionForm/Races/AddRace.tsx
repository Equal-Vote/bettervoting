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

    const onAddRace = async (editedRace) => {
        let success = await updateElection(election => {
            election.races.push({
                ...editedRace,
                race_id: makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE)
            })
        }) && await deleteAllBallots();
        if (!success) return false
        await refreshElection()
        return true
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'row'
        }}>
            <PrimaryButton
                onClick={() => setOpen(true)}
                disabled={election.state!=='draft'}>
                Add Race
            </PrimaryButton>
            <RaceForm
                raceIndex={undefined}
                onCancel={() => setOpen(false)}
                onConfirm={async (editedRace) => (await onAddRace(editedRace) && setOpen(false))}
                dialogOpen={open}
                styling='Dialog'
            />
        </Box>
    )
}
