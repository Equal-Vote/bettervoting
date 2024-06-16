import React, { useState }  from 'react'
import { TableContainer, Typography, Paper, Box} from "@mui/material";
import { roundResults, starResults, starSummaryData } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import { Widget, WidgetContainer, ResultsTable, ResultsBarChart } from '~/components/util';
import { useTranslation } from 'react-i18next';

type candidateTableEntry = {
  name: string,
  votes: number,
  index: number,
  runoffVotes: number
}


export default ({results, rounds}: {results: starResults, rounds: number }) => {
    const winnerIndex = results.roundResults[0].winners[0].index;
    const runnerUpIndex = results.roundResults[0].runner_up[0].index;

    // NOTE: I'm only using the runoff data, but I'm still generating all the data in case I need them later
    const tableData: candidateTableEntry[] = results.summaryData.candidates.map((c, i) => ({
        name: c.name,
        votes: results.summaryData.totalScores[i].score,
        runoffVotes:
          i == winnerIndex ?
            results.summaryData.preferenceMatrix[winnerIndex][runnerUpIndex] : (
          i == runnerUpIndex ?
            results.summaryData.preferenceMatrix[runnerUpIndex][winnerIndex] : 
            0 ),
        index: i
    }));

    const {t} = useTranslation();

    tableData.sort((a, b) => b.votes - a.votes);

    let runoffData = tableData.slice(0, 2);
    let finalistVotes = (runoffData[0].runoffVotes + runoffData[1].runoffVotes)
    runoffData.sort((a, b) => b.runoffVotes - a.runoffVotes);
    runoffData.push({
      name: t('general.equal_preferences'),
      votes: 0,
      runoffVotes: results.summaryData.nValidVotes - finalistVotes,
      index: -1,
    })

    return ( <>
      <WidgetContainer>
        <Widget title={t('results.star.score_table_title')}>
          <ResultsTable className='starScoreTable' data={[
            t('results.star.score_table_columns', {returnObjects: true}),
            ...tableData.map(c => [c.name, c.votes]),
          ]} />
        </Widget>
        <Widget title={t('results.star.runoff_table_title')}>
          <ResultsTable className='starRunoffTable' data={[
            t('results.star.runoff_table_columns', {returnObjects: true}),
            ...runoffData.map((c, i) => [
              c.name,
              c.runoffVotes,
              `${Math.round(c.runoffVotes * 1000 / results.summaryData.nValidVotes) / 10}%`,
              i == 2 ? '' : `${Math.round(c.runoffVotes * 1000 / finalistVotes) / 10}%`,
            ]),
            [t('general.total'), results.summaryData.nValidVotes, '100%', '100%'] 
            ]}/>
        </Widget>
      </WidgetContainer>
    </>);
}
