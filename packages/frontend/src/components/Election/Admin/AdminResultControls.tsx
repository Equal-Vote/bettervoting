import useElection from "~/components/ElectionContextProvider";
import ElectionStateWarning from "../ElectionStateWarning"
import { SwitchSetting } from "~/components/util";
import { useSetPublicResults } from "../../../hooks/useAPI";
import { Box, Link, Typography } from "@mui/material";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import ShareButton from "../ShareButton";

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
        <Box display='flex' flexDirection='column' gap={1}>
            <SwitchSetting
                label={t('results.admin_results_toggle')}
                toggled={election.settings.public_results === true}
                onToggle={togglePublicResults}
                disabled={!!election.settings.ballot_updates}
                disabledMessage={t('disabled_msgs.public_results')}
            />
            {election.settings.public_results &&
                <ShareButton url={`${window.location.origin}/${election.election_id}/results`} textKey='share.button_results' />
            }
            {election.state == 'draft' && <Typography component="p">
                This poll is still being drafted. All ballots will be counted as test votes and shall be reset prior to the final poll
            </Typography>}
        </Box>
    </ElectionStateWarning>
}
