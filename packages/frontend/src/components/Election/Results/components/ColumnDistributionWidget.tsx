import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import Widget from "./Widget";
import useRace from "~/components/RaceContextProvider";
import { Divider, Typography } from "@mui/material";
import ResultsBarChart from "./ResultsBarChart";

// candidates helps define the order
const ColumnDistributionWidget = () => {
    const {ballotsForRace} = useAnonymizedBallots();
    const {t, race} = useRace();

    const numColumns = [];
    let whichColumns = [];
    let totalColumns = 0;

    const incIndex = (arr, key) => {
        const index = (arr == numColumns) ? key-1 : key;
        if(index < 0) return; // Quick Hack to keep the page from crashing
        while(index >= arr.length ){
            arr.push({
                name: (arr == numColumns)? arr.length + 1 : arr.length,
                count: 0
            });
        }
        arr[index].count++;
    }

    const b = ballotsForRace()
    b.forEach((scores) => {
        [...new Set(scores.map(score => score.score ?? 0))].forEach(score => incIndex(whichColumns, score));

        const definedScores = scores.filter(score => score.score !== undefined && score.score !== null);
        totalColumns += definedScores.length;
        incIndex(numColumns, definedScores.length);
    })

    whichColumns = whichColumns.map(c => ({...c, name: c.name == 'blank'? 'blank' : `${c.name}⭐`}))

    return <Widget title={t(`results_ext.column_distribution_title`)} wide>
        <Typography variant='h6'>{t(`results_ext.column_distribution_num_avg`, {count: Math.round(100*totalColumns / b.length)/100})}</Typography>
        <Divider/>
        <Typography variant='h6'>{t(`results_ext.column_distribution_num_title`)}</Typography>
        <ResultsBarChart data={numColumns} xKey='count' percentage={true}/>
        <Divider/>
        {(race.voting_method == 'STAR' || race.voting_method == 'STAR_PR') && <>
            <Typography variant='h6'>{t('results_ext.column_distribution_which_title')}</Typography>
            <ResultsBarChart data={whichColumns} xKey='count' percentage={true} percentDenominator={b.length}/>
        </>}
    </Widget>
}

export default ColumnDistributionWidget;