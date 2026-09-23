import { Box, Typography } from "@mui/material";
import useElection from "~/components/ElectionContextProvider";
import useRace from "~/components/RaceContextProvider";
import ResultsBarChart from "../components/ResultsBarChart"
import Widget from "../components/Widget"
import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import { getEntry } from "@equal-vote/star-vote-shared/domain_model/Util";
import { candidate, starResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

// One "equal support" histogram per seat. Single-winner STAR has one roundResults
// entry; Bloc STAR (STAR with num_winners > 1) has one per seat, each with its own
// runoff pair, so the histogram has to be counted again for every seat.
const STAREqualPreferencesWidget = () => {
    const {t} = useElection();
    const {results} = useRace();
    const {ballotsForRace} = useAnonymizedBallots();
    const roundResults = (results as starResults).roundResults;
    const ballots = ballotsForRace();

    const countEqualPreferences = (frontRunners: [candidate, candidate]) => {
        const equalPreferences = new Array(6).fill(0);
        ballots.forEach(scores => {
            // treat skipped candidates (null score) as 0, matching the tabulator
            const topScores = frontRunners.map(c => getEntry(scores, c.id, 'candidate_id').score ?? 0);
            if(topScores[0] == topScores[1]) equalPreferences[topScores[0]]++;
        })
        return equalPreferences;
    }

    return <Widget title={t('results.star.equal_preferences_title')} wide>
        {roundResults.map((round, r) => {
            const winner = round.winners[0];
            const runnerUp = round.runner_up[0];
            return <Box key={r} sx={{width: '100%'}}>
                {roundResults.length > 1 && <>
                    <Typography variant="h4">{t('results.star.seat_heading', {n: r + 1})}</Typography>
                    {runnerUp && <Typography>{t('results.star.equal_preferences_pair', {winner: winner.name, runner_up: runnerUp.name})}</Typography>}
                </>}
                {runnerUp ?
                    <ResultsBarChart data={countEqualPreferences([winner, runnerUp]).map((count, i) => ({name: `${i} ⭐`, count})).reverse()} xKey='count' percentage={true}/>
                :
                    // the last seat of a race with as many seats as candidates has no runoff: Star.ts seats the lone remaining candidate
                    <Typography>{t('results.single_candidate_result', {name: winner.name})}</Typography>
                }
            </Box>
        })}
    </Widget>
}

export default STAREqualPreferencesWidget;
