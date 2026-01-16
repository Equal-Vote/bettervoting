import { useState } from "react"
import Typography from '@mui/material/Typography';
import { Box, Paper, Tooltip } from "@mui/material"
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RaceDialog from './RaceDialog';
import { useEditRace } from './useEditRace';
import RaceForm from './RaceForm';
import useElection from '../../ElectionContextProvider';
import { ContentCopy } from '@mui/icons-material';
import { Race as IRace } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ID_LENGTHS, ID_PREFIXES, makeID } from "@equal-vote/star-vote-shared/utils/makeID";
import { useDeleteAllBallots } from "~/hooks/useAPI";
import useConfirm from "~/components/ConfirmationDialogProvider";

export interface NewRace extends Omit<IRace, 'voting_method'> {
    voting_method: "STAR" | "STAR_PR" | "Approval" | "RankedRobin" | "IRV" | "Plurality" | "STV" | ""
}
interface RaceProps {
    race: IRace
    race_index: number
}

export default function Race({ race, race_index }: RaceProps) {
    const { election, updateElection, refreshElection } = useElection()
    const { makeRequest: deleteAllBallots } = useDeleteAllBallots(election.election_id);
    const confirm = useConfirm();
    const [open, setOpen] = useState(false);

    const onSave = async (editedRace) => {
        const success = await updateElection(election => {
            election.races[race_index] = editedRace
        }) && await deleteAllBallots()
        if (!success) return false
        await refreshElection()
        return true
    }

    const onDuplicate = async () => {
        const race = election.races[race_index];
        const success = await updateElection(election => {
            election.races.push({
                ...race,
                title: 'Copy Of ' + race.title,
                race_id: makeID(ID_PREFIXES.RACE, ID_LENGTHS.RACE)
            })
        }) && deleteAllBallots()
        if (!success) return false
        await refreshElection()
        return true
    }

    const onDelete = async () => {
        const confirmed = await confirm({ title: 'Confirm', message: 'Are you sure?' })
        if (!confirmed) return false
        let success = await updateElection(election => {
            election.races.splice(race_index, 1)
        })
        success = success && await deleteAllBallots()
        if (!success) return false
        await refreshElection()
        return true
    }

    return (
        <Paper elevation={4} sx={{ width: '100%'}}>
            <Box
                sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 10 }}
                alignItems={'center'}
            >
                <Box sx={{ width: '100%', pl: 2 }}>
                    <Typography variant="h5" component="h5">{race.title}</Typography>
                </Box>
                <Box sx={{ flexShrink: 1, p: 1 }}>
                    <Tooltip title='Duplicate'>
                        <IconButton
                            aria-label='Duplicate'
                            onClick={onDuplicate}
                            disabled={election.state !== 'draft'}>
                            <ContentCopy />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Box sx={{ flexShrink: 1, p: 1 }}>
                    <Tooltip title='Edit'>
                        <IconButton
                            aria-label={`Edit Race: ${race.title}`}
                            onClick={() => setOpen(true)}>
                            {election.state === 'draft' ? <EditIcon /> : <VisibilityIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
                <Box sx={{ flexShrink: 1, p: 1 }}>
                    <Tooltip title='Delete'>
                        <IconButton
                            aria-label={`Delete Race: ${race.title}`}
                            color="error"
                            onClick={onDelete}
                            disabled={election.state !== 'draft'}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

            </Box>
            <RaceForm
                raceIndex={race_index}
                onConfirm={async (editedRace) => (await onSave(editedRace) && setOpen(false))}
                onCancel={() => setOpen(false)}
                dialogOpen={open}
                styling='Dialog'
            />
        </Paper >
    )
}
