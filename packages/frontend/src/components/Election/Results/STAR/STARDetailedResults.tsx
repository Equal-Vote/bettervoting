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

    const tableData: candidateTableEntry[] = results.summaryData.candidates.map((c, i) => ({
        name: c.name,
        votes: c.score,
        runoffVotes: i < 2 ? c.votesPreferredOver[results.summaryData.candidates[1-i].id] : 0,
    }));

    const runoffData = tableData.slice(0, 2);
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