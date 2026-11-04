import { starResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { Paper, Typography } from "@mui/material";
import { useSubstitutedTranslation } from "~/components/util";


const STARExtraContext = ({ results, roundIndex }: {results: starResults, roundIndex: number}) => {
    // useSubstitutedTranslation, not the bare react-i18next hook: it is what
    // turns [text](url) in the locale file into an actual link.
    const { t } = useSubstitutedTranslation();
    const width = 'auto';
    const winner = results.roundResults[roundIndex].winners[0];
    const runnerUp = results.roundResults[roundIndex].runner_up[0];
    if (winner.score < runnerUp.score) {
        return (
            <Paper elevation={4} sx={{ width: width, margin: 'auto', textAlign: 'left', padding: 3, marginTop: 2 }}>
                <b>{t('results.star.score_higher_than_runoff_title')}</b>
                <hr />
                <Typography>
                    {t('results.star.score_higher_than_runoff_text')}
                </Typography>
            </Paper>
        );
    }

    return null; // Return null if the condition is not met
}

export default STARExtraContext;