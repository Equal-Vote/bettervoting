import React, { useEffect, useState } from 'react'
import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { starResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import { ResultsPieChart, Widget, WidgetContainer } from '~/components/util';
import { ResultsBarChart } from '~/components/util';
import { useTranslation } from 'react-i18next';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';

const STARResultSummaryWidget = ({ results, roundIndex }: {results: starResults, roundIndex: number }) => {
    const {t} = useTranslation();

    const [pie, setPie] = useState(false);

    const prevWinners = results.roundResults
        .filter((_, i) => i < roundIndex)
        .map(round => round.winners)
        .flat(1)
        .map(winner => winner.index);

    const histData = results.summaryData.candidates
        .map((c, i) => ({
            name: c.name,
            index: i,
            votes: results.summaryData.totalScores[i].score,
            // vvvv HACK to get the bars to fill the whole width, this is useful if we want to test the graph padding
            votesBig: results.summaryData.totalScores[i].score*10000 
        }))
        .filter((_, i) => !prevWinners.includes(i));

    const winnerIndex = results.roundResults[roundIndex].winners[0].index;
    const runnerUpIndex = results.roundResults[roundIndex].runner_up[0].index;
    const winnerVotes = results.summaryData.preferenceMatrix[winnerIndex][runnerUpIndex];
    const runnerUpVotes = results.summaryData.preferenceMatrix[runnerUpIndex][winnerIndex];

    var pieData = [
        {
            name: results.summaryData.candidates[winnerIndex].name,
            votes: winnerVotes
        },
        {
            name: results.summaryData.candidates[runnerUpIndex].name,
            votes: runnerUpVotes
        },
    ];

    let runoffData = [...pieData]
    runoffData.push({
      name: t('general.equal_preferences'),
      votes: results.summaryData.nValidVotes - winnerVotes - runnerUpVotes,
    })

    return (
        <Box className="resultWidget">
        <WidgetContainer>
            <Widget title={t('results.star.score_title')}>
                {(t('results.star.score_description', {returnObjects: true}) as Array<String>).map( (s, i) => <p key={i}>{s}</p>)}
                <ResultsBarChart
                    data={histData}
                    sortFunc={(a, b) => {
                        if(a.index == winnerIndex) return -1;
                        if(b.index == winnerIndex) return 1;
                        if(a.index == runnerUpIndex) return -1;
                        if(b.index == runnerUpIndex) return 1;
                        return b.votes - a.votes;
                    }}
                    percentage={false} 
                    percentDenominator={results.summaryData.nValidVotes*5} 
                    majorityOffset
                />
            </Widget>
            <Widget title='Automatic Runoff Round'>
                {(t('results.star.runoff_description', {returnObjects: true}) as Array<String>).map( (s, i) => <p key={i}>{s}</p>)}
                {pie ? 
                    <ResultsPieChart data={pieData} star />
                :
                <>
                    <ResultsBarChart data={runoffData} star runoff percentage sortFunc={false} majorityLegend={t('results.star.runoff_majority')} />
                    <Box height={50}/> {/*HACK to get the bar chart to be the same height as the pie chart*/}
                </>
                }
                <ToggleButtonGroup
                    value={pie}
                    exclusive
                    onChange={(event, value) => setPie(value)}
                    sx={{
                        marginLeft: 'auto'
                    }}
                >
                    <ToggleButton value={false} sx={{height: 30}}>
                        <BarChartIcon sx={{transform: 'scale(.7)'}}/>
                    </ToggleButton>
                    <ToggleButton value={true} sx={{height: 30}}>
                        <PieChartIcon sx={{transform: 'scale(.7)'}}/>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Widget>
        </WidgetContainer>
        </Box>
    );
}
export default STARResultSummaryWidget 
