/*
  Describe, to the default level of detail, how the IRV (Ware) tally found a
  winner.
*/

import Typography from '@mui/material/Typography';
import WidgetContainer from '../components/WidgetContainer';
import Widget from '../components/Widget';
import {
  irvCandidate,
  irvResults,
  irvRoundResults
} from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import ResultsBarChart from "../components/ResultsBarChart";
import { irvContext, irvWinnerSearch } from "./ifc";
import useRace from '~/components/RaceContextProvider';

export function IRVWinnerView ( {win, context}:{
  win: irvWinnerSearch, context: irvContext
}) {
  let {results, t} = useRace();

  results = results as irvResults;

  const firstRoundData = results.summaryData.candidates.map((c: irvCandidate) => ({
    name: c.name,
    votes: c.hareScores[win.firstRoundIndex] 
  }))
  const runoffData = [
    ...results.summaryData.candidates
      .filter(c => results.roundResults.slice(0, win.lastRoundIndex).every(round => !round.eliminated.map(cc => cc.id).includes(c.id)))
      .map((c: irvCandidate) => ({
        name: c.name,
        votes: c.hareScores[win.lastRoundIndex] 
      })),
    {
      name: t('results.rcv.exhausted'),
      votes: results.roundResults[win.lastRoundIndex].exhaustedVoteCount
    }
  ];

  // Half of the votes still active in the final round — which is what the
  // marker is drawn at, while the bar labels are shares of every ballot in the
  // chart including the exhausted ones. The legend names which it is half of.
  const activeVotes = runoffData
    .slice(0, -1)
    .reduce((sum, d) => sum + (d.votes ?? 0), 0);

  return <WidgetContainer>
    <Widget title={t('results.rcv.first_choice_title')}>
      <ResultsBarChart data={firstRoundData} percentage majorityOffset/>
    </Widget>
    <Widget title={t('results.rcv.final_round_title')}>
      < ResultsBarChart
        data={runoffData} runoff stars={1} percentage
        majorityLegend={t('results.rcv.runoff_majority', {n: activeVotes})}
      />
    </Widget>
  </WidgetContainer>
}
