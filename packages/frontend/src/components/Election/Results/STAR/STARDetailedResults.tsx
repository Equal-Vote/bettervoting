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

    // Finalists come from the round's winner + runner-up — not from
    // summaryData.candidates positions 0 and 1, which are score-ordered and
    // can disagree with the tabulator's actual finalists when a tiebreaker
    // (five-star, random, etc.) advances the lower-listed of two score-tied
    // candidates.
    const winner = results.roundResults[0].winners[0];
    const runnerUp = results.roundResults[0].runner_up[0];
    const finalistOpponent: Record<string, string> = {
        [winner.id]: runnerUp.id,
        [runnerUp.id]: winner.id,
    };

    // Score table rows 1 and 2 are gold-highlighted via CSS (.starScoreTable
    // tr:nth-child) on the assumption that they're the finalists. Pin the
    // actual winner + runner-up there before listing the rest by score, so
    // the highlight tracks who really advanced rather than score-position.
    const restCandidates = results.summaryData.candidates
        .filter(c => c.id !== winner.id && c.id !== runnerUp.id);
    const orderedCandidates = [winner, runnerUp, ...restCandidates];
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