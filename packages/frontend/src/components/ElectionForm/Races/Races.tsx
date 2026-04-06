import Typography from '@mui/material/Typography';
import { Box, Stack } from "@mui/material"
import useElection from '../../ElectionContextProvider';
import Race from './Race';
import AddRace from './AddRace';
import { AdminPageNavigation } from '../../Election/Sidebar';

export default function Races() {
    const { election, t } = useElection()

    return (
        <Stack spacing={2} sx={{width: '100%'}}>
            {election.races?.map((race, race_index) => (
                <Race key={race.race_id} race={race} race_index={race_index} />
            ))
            }

            <AddRace/>
            <AdminPageNavigation />
        </Stack >
    )
}
