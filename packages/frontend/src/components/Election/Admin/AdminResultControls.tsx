import useElection from "~/components/ElectionContextProvider";
import ElectionStateWarning from "../ElectionStateWarning"
import { Divider, Switch, Typography } from "@mui/material";

export default () => {
    const { election, voterAuth } = useElection();

    return <ElectionStateWarning title='results.admin_title' description='' hideIcon>
        <Typography component='p'>
            <Switch/>
        </Typography>
        {election.state === 'draft' && <>
            <br/>
            <Typography component='p'>
                This poll is still being drafted. The ballots cast so far are test votes, and will be cleared once the poll is finalized.
            </Typography>
        </>}
    </ElectionStateWarning>
}