import Typography from '@mui/material/Typography';
import { Box, Stack } from "@mui/material"
import useElection from '../../ElectionContextProvider';
import Race from './Race';
import AddRace from './AddRace';

export default function Races() {
    const { election } = useElection()

    return (
        <Stack spacing={2} sx={{width: '100%'}}>
            <Box display='flex' flexDirection='row' gap={4} alignItems='center'>
                <Typography gutterBottom variant="h4" component="h4">Races</Typography>
            </Box>

            {election.races?.map((race, race_index) => (
                <Race key={race.race_id} race={race} race_index={race_index} />
            ))
            }

            <AddRace/>
        </Stack >
    )
}
