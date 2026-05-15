import { starResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import WidgetContainer from '../components/WidgetContainer';
import Widget from '../components/Widget';
import ResultsTable from '../components/ResultsTable';
import useRace from '~/components/RaceContextProvider';
import { getEntry } from '@equal-vote/star-vote-shared/domain_model/Util';
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

    // Relies on summaryData.candidates being ordered by the backend so that
    // position 0 is the runoff winner and position 1 is the runoff runner-up
    // (see Star.ts's winRound / runnerUpRound sort key). The score table
    // gold-highlights rows 1 and 2 via CSS (.starScoreTable tr:nth-child),
    // so this ordering is what makes the highlight track the actual finalists
    // rather than score-position — a tiebreaker (five-star, random, etc.)
    // can advance a runner-up that isn't the second-highest scorer.
    // Only reached for single-winner STAR (see Results.tsx).
    const [winner, runnerUp] = results.summaryData.candidates;
    const finalistOpponent: Record<string, string> = {
        [winner.id]: runnerUp.id,
        [runnerUp.id]: winner.id,
    };

    const tableData: candidateTableEntry[] = results.summaryData.candidates.map((c) => ({
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