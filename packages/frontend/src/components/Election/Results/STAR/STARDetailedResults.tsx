import { starResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import WidgetContainer from '../components/WidgetContainer';
import Widget from '../components/Widget';
import ResultsTable from '../components/ResultsTable';
import useRace from '~/components/RaceContextProvider';
import { formatPercent } from '~/components/util';

type candidateTableEntry = {
  name: string,
  votes: number,
  runoffVotes: number
}

const STARDetailedResults = () => {
    let {results} = useRace();
    const {t} = useRace();
    results = results as starResults;

    // Finalists come from the tabulator's explicit fields, not from candidate order.
    // Only reached for single-winner STAR (see Results.tsx).
    const winner = results.roundResults[0]?.winners[0];
    const runnerUp = results.roundResults[0]?.runner_up[0];
    if (!winner || !runnerUp) return null;
    const finalistOpponent: Record<string, string> = {
        [winner.id]: runnerUp.id,
        [runnerUp.id]: winner.id,
    };

    // The score table highlights its first two rows (.starScoreTable in index.css), so put
    // the finalists there and list everyone else after them in the backend's order.
    const orderedCandidates = [
        winner,
        runnerUp,
        ...results.summaryData.candidates.filter(c => c.id !== winner.id && c.id !== runnerUp.id),
    ];
    const tableData: candidateTableEntry[] = orderedCandidates.map((c) => ({
        name: c.name,
        votes: c.score,
        runoffVotes: finalistOpponent[c.id] !== undefined
            ? c.votesPreferredOver[finalistOpponent[c.id]]
            : 0,
    }));

    const runoffData: candidateTableEntry[] = [winner, runnerUp].map((c) => ({
        name: c.name,
        votes: c.score,
        runoffVotes: c.votesPreferredOver[finalistOpponent[c.id]],
    }));
    const finalistVotes = runoffData[0].runoffVotes + runoffData[1].runoffVotes
    runoffData.push({
      name: t('results.star.equal_preferences'),
      votes: 0,
      runoffVotes: results.summaryData.nTallyVotes - finalistVotes,
    })

    return ( <>
      <WidgetContainer>
        <Widget title={t('results.star.score_table_title')}>
          <ResultsTable className='starScoreTable' data={[
            t('results.star.score_table_columns'),
            ...tableData.map(c => [c.name, c.votes]),
          ]} />
        </Widget>
        <Widget title={t('results.star.runoff_table_title')}>
          <ResultsTable className='starRunoffTable' data={[
            t('results.star.runoff_table_columns'),
            ...runoffData.map((c, i) => [
              c.name,
              c.runoffVotes,
              formatPercent(c.runoffVotes / results.summaryData.nTallyVotes),
              i == 2 ? '' : formatPercent(c.runoffVotes / finalistVotes),
            ]),
            [t('keyword.total'), results.summaryData.nTallyVotes, '100%', '100%'] 
            ]}/>
        </Widget>
      </WidgetContainer>
    </>);
}
export default STARDetailedResults;