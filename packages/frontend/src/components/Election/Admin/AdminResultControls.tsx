import useElection from "~/components/ElectionContextProvider";
import ElectionStateWarning from "../ElectionStateWarning"
import { SwitchSetting } from "~/components/util";
import { useSetPublicResults } from "../../../hooks/useAPI";
import { Typography } from "@mui/material";

export default ({ onResultsToggle }: { onResultsToggle?: () => void }) => {
    const { election, refreshElection, t } = useElection();
    const { makeRequest } = useSetPublicResults(election.election_id);

    const togglePublicResults = async (newValue: boolean): Promise<false | void> => {
        try {
            await makeRequest({ public_results: newValue });
            await refreshElection();
            onResultsToggle?.();
        } catch {
            return false;
        }
    };

    return <ElectionStateWarning title='results.admin_title' description='' hideIcon>
        <SwitchSetting
            label={t(election.settings.public_results ? 'results.admin_results_public' : 'results.admin_results_hidden')}
            toggled={election.settings.public_results === true}
            onToggle={togglePublicResults}
        />
        {election.state == 'draft' && <Typography component="p">
            This poll is still being drafted. All ballots will be counted as test votes and shall be reset prior to the final poll
        </Typography>}
    </ElectionStateWarning>
}
