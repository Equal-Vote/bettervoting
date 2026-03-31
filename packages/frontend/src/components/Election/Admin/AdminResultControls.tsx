import useElection from "~/components/ElectionContextProvider";
import ElectionStateWarning from "../ElectionStateWarning"
import { Typography } from "@mui/material";
import SwitchSetting from "./SwitchSetting";
import { useSetPublicResults } from "../../../hooks/useAPI";

export default ({ onResultsToggle }: { onResultsToggle?: () => void }) => {
    const { election, refreshElection, t } = useElection();
    const { makeRequest } = useSetPublicResults(election.election_id);

    const showToggle = !['draft', 'finalized'].includes(election.state) &&
        !(election.state === 'open' && election.settings.ballot_updates);

    const togglePublicResults = async (newValue: boolean): Promise<false | void> => {
        try {
            await makeRequest({ public_results: newValue });
            await refreshElection();
            onResultsToggle?.();
        } catch {
            return false;
        }
    };

    // TODO: add some error scenarios where election is outside draft but can't be toggled
    //  - if updatable ballots is enabled then the toggle should be disabled

    return <ElectionStateWarning title='results.admin_title' description='' hideIcon>
        {showToggle && (
            <SwitchSetting
                label={t(election.settings.public_results ? 'results.admin_results_public' : 'results.admin_results_hidden')}
                checked={election.settings.public_results === true}
                onToggle={togglePublicResults}
            />
        )}
        {election.state == 'draft' && <Typography component="p">
            This poll is still being drafted. All ballots will be counted as test votes and shall be reset prior to the final poll
        </Typography>}
    </ElectionStateWarning>
}
