import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import Widget from "./Widget";
import useRace from "~/components/RaceContextProvider";
import { Typography } from "@mui/material";
import ResultsBarChart from "./ResultsBarChart";

// candidates helps define the order
const ScoreRangeWidget = () => {
    const {ballotsForRace} = useAnonymizedBallots();
    const {t, results} = useRace();

    const numAtDiff = [];

    const incIndex = (arr, index) => {
        if(index < 0) return; // Quick Hack to keep the page from crashing
        while(index >= arr.length){
            arr.push({
                name: arr.length,
                count: 0
            });
        }
        arr[index].count++;
    }

    const ballots = ballotsForRace();

    ballots.forEach((scores) => {
        incIndex(numAtDiff,
            scores.reduce((prev,score) => Math.max(prev, score.score), 0) - 
            scores.reduce((prev,score) => Math.min(prev, score.score), 20)
        )
    })

    // This chart histograms every ballot that scored at least one candidate,
    // while the tabulation drops ballots that gave every candidate the same
    // score. Say both numbers out loud rather than leaving the percentages
    // sitting on an invisible denominator.
    const nAbstentions = Math.max(0, ballots.length - results.summaryData.nTallyVotes);

    return <Widget title={t(`results_ext.score_range_title`)}>
        <Typography variant='h6'>{t(`results_ext.score_range_sub_title`, {count: ballots.length})}</Typography>
        <ResultsBarChart data={numAtDiff.reverse()} xKey='count' percentage={true}/>
        {nAbstentions > 0 &&
            <Typography sx={{'textAlign': 'left'}}>{t(`results_ext.score_range_abstention_note`, {count: nAbstentions})}</Typography>
        }
        <Typography sx={{'textAlign': 'left'}}>{t(`results_ext.score_range_warning`)}</Typography>
    </Widget>
}

export default ScoreRangeWidget;