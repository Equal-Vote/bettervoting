import { Box, Button, Pagination } from "@mui/material";
import React, { ReactNode } from "react";
import { useState } from 'react';
import Typography from '@mui/material/Typography';
import { commaListFormatter, formatPercent, useSubstitutedTranslation } from '../../util';
import STARResultSummaryWidget from "./STAR/STARResultSummaryWidget";
import STARDetailedResults from "./STAR/STARDetailedResults";
import STARResultDetailedStepsWidget from "./STAR/STARResultDetailedStepsWidget";
import WinnerResultPages from "./WinnerResultPages";
import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { allocatedScoreResults, approvalResults, ElectionResults, irvResults, rankedRobinResults, starCandidate, starResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import useElection from "../../ElectionContextProvider";
import DetailExpander from "./components/DetailExpander";
import ResultsTable from "./components/ResultsTable";
import Widget from "./components/Widget";
import WidgetContainer from "./components/WidgetContainer";
import ResultsBarChart from "./components/ResultsBarChart";
import HeadToHeadWidget from "./components/HeadToHeadWidget";
import useRace, { RaceContextProvider } from "~/components/RaceContextProvider";
import VoterProfileWidget from "./components/VoterProfileWidget";
import VoterIntentWidget from "./components/VoterIntentWidget";
import ColumnDistributionWidget from "./components/ColumnDistributionWidget";
import NameRecognitionWidget from "./components/NameRecognitionWidget";
import ScoreRangeWidget from "./components/ScoreRangeWidget";
import useFeatureFlags from "~/components/FeatureFlagContextProvider";
import STAREqualPreferencesWidget from "./STAR/STAREqualPreferencesWidget";
import VoterErrorStatsWidget from "./components/VoterErrorStatsWidget";
import { irvWinnerSearch } from "./IRV/ifc";
import { IRVTopResultsView } from "./IRV/top";

function STARResultsViewer({ filterRandomFromLogs }: {filterRandomFromLogs: boolean }) {
  let i = 0;
  let {results} = useRace();
  const { t, race} = useRace();
  const rounds = race.num_winners;
  const roundIndexes = Array.from({length: rounds}, () => i++);
  const flags = useFeatureFlags();
  const candidates = results.summaryData.candidates;

  results = results as starResults;

  return <ResultsViewer methodKey='star'>
    <WinnerResultPages numWinners={rounds}>
      {roundIndexes.map((i) => <STARResultSummaryWidget key={`STAR-widget-${i}`} results={results} roundIndex={i} t={t}/>)}
    </WinnerResultPages>
    {rounds == 1 &&
      <DetailExpander>
        <STARDetailedResults/>
        <DetailExpander level={1}>
          <STARResultDetailedStepsWidget results={results} rounds={rounds} t={t} filterRandomFromLogs={filterRandomFromLogs}/>
          <STAREqualPreferencesWidget frontRunners={candidates.slice(0, 2) as [starCandidate, starCandidate]}/>
          <HeadToHeadWidget/>
          <VoterProfileWidget topScore={5}/>
          {flags.isSet('ALL_STATS') && <ScoreRangeWidget/>}
          {flags.isSet('ALL_STATS') && <ColumnDistributionWidget/>}
          {flags.isSet('ALL_STATS') && <NameRecognitionWidget/>}
        </DetailExpander>
      </DetailExpander>
    }
    {rounds > 1 &&
      <DetailExpander>
        <STARResultDetailedStepsWidget results={results} rounds={rounds} t={t} filterRandomFromLogs={filterRandomFromLogs}/>
      </DetailExpander>
    }
  </ResultsViewer>
}

function RankedRobinResultsViewer() {
  let {results} = useRace();
  const {t} = useRace();
  results = results as rankedRobinResults;

  const candidates = results.summaryData.candidates;

  return <ResultsViewer methodKey='ranked_robin'>
    <WidgetContainer>
      <Widget title={t('results.ranked_robin.bar_title')}>
        <ResultsBarChart
          data={
            candidates.map((c) => ({name: c.name, votes: c.copelandScore}))
          }
          percentage
          percentDenominator={results.summaryData.candidates.length-1}
          stars={1}
        />
      </Widget>
    </WidgetContainer>

    <DetailExpander>
      <WidgetContainer>
        <Widget title={t('results.ranked_robin.table_title')}>
          <ResultsTable className='rankedRobinTable' data={[
            t('results.ranked_robin.table_columns'),
            ...results.summaryData.candidates.map(c => [
              c.name, c.copelandScore, formatPercent(c.copelandScore / (results.summaryData.candidates.length-1))
            ])
          ]}/>
        </Widget>
        <HeadToHeadWidget/>
        <VoterProfileWidget topScore={1} ranked />
      </WidgetContainer>
    </DetailExpander>
  </ResultsViewer>
}

function IRVResultsViewer() {
  let {results} = useRace();
  const {t} = useRace();
  results = results as irvResults;

  const {roundResults, exhaustedVoteCounts} = results;

  /* For top view: */

  /* Put all round information in one place. */

  if (roundResults.length !== exhaustedVoteCounts.length)
    console.error(Error("IRV round counts don't match."));
  const roundCount = roundResults.length;
  for (let idx = 0; idx < roundCount; idx++) {
    const cur = roundResults[idx];
    cur.exhaustedVoteCount = exhaustedVoteCounts[idx];
    cur.isStartOfSearch = 0 === idx || ! ! roundResults[idx - 1].winners.length;
  }

  /* Group the rounds by searches for a winner. */

  const wins: irvWinnerSearch[] = [];
  let rx = 0; /* round index */
  const lim = roundResults.length;
  while (rx < lim) {
    const win: irvWinnerSearch = {
      firstRoundIndex: rx,
      lastRoundIndex: null
    };
    while (! roundResults[rx].winners.length)
      rx++;
    win.lastRoundIndex = rx;
    wins.push(win);
    rx++; /* advance past the round that found the winner */
  }

  /* End of setting up for top view. */

  const tabulationRows = results.summaryData.candidates.map(c => ([c.name,...c.hareScores]));
  tabulationRows.unshift([
    t('results.rcv.tabulation_candidate_column'),
    ...(Array.from(Array(tabulationRows[0].length-1).keys()).map(i => t('results.rcv.round_column', {n: i+1})))
  ])
  tabulationRows.push([t('results.rcv.exhausted'), ...results.exhaustedVoteCounts.map(i => ''+i)])

  return <ResultsViewer methodKey='rcv'>
    < IRVTopResultsView wins={wins} context={{
      candidatesByIndex: results.summaryData.candidates, t
    }}/>
    <DetailExpander>
      <WidgetContainer>
        <Widget title={t('results.rcv.table_title')} wide>
          <ResultsTable className='rcvTable' data={tabulationRows}/>
        </Widget>
      </WidgetContainer>
      <DetailExpander level={1}>
        <HeadToHeadWidget/>
        <VoterProfileWidget topScore={1} ranked/>
        <VoterIntentWidget/>
        <VoterErrorStatsWidget/>
        <ColumnDistributionWidget/>
      </DetailExpander>
    </DetailExpander>
  </ResultsViewer>
}

function PluralityResultsViewer() {
  const { results } = useRace();
  const { t } = useRace();

  return <ResultsViewer methodKey='choose_one'>
    <WidgetContainer>
      <Widget title={t('results.choose_one.bar_title')}>
        <ResultsBarChart
          data={
            results.summaryData.candidates.map(c => ({
              name: c.name,
              votes: c.score,
            }))
          }
          stars={1}
          percentage
        />
      </Widget>
    </WidgetContainer>

    <DetailExpander>
      <WidgetContainer>
        <Widget title={t('results.choose_one.table_title')}>
          <ResultsTable className='chooseOneTable' data={[
            t('results.choose_one.table_columns'),
            ...results.summaryData.candidates.map(c => [
              c.name, c.score, formatPercent(c.score / results.summaryData.nTallyVotes)
            ])
          ]}/>
        </Widget>
      </WidgetContainer>
    </DetailExpander>
  </ResultsViewer>
}

function ApprovalResultsViewer() {
  let {results} = useRace();
  const { race, t} = useRace();
  results = results as approvalResults;
  const flags = useFeatureFlags();

  return <ResultsViewer methodKey='approval'>
    <WidgetContainer>
      <Widget title={t('results.approval.bar_title')}>
        <ResultsBarChart
          data={
            results.summaryData.candidates.map((c) => ({
              name: c.name,
              votes: c.score
            }))
          }
          stars={race.num_winners}
          percentage
          percentDenominator={results.summaryData.nTallyVotes} 
        />
      </Widget>
    </WidgetContainer>

    <DetailExpander>
      <WidgetContainer>
        <Widget title={t('results.approval.table_title')}>
          <ResultsTable winningRows={race.num_winners} data={[
            t('results.approval.table_columns'),
            ...results.summaryData.candidates.map(c => [
              c.name,
              c.score,
              formatPercent(c.score / results.summaryData.nTallyVotes)
            ])
          ]}/>
        </Widget>
      </WidgetContainer>

      <DetailExpander level={1}>
        <HeadToHeadWidget/>
        <VoterProfileWidget topScore={1}/>
        {flags.isSet('ALL_STATS') && <ColumnDistributionWidget/>}
      </DetailExpander>
    </DetailExpander>
  </ResultsViewer>
}

function ResultsViewer({ methodKey, children }:{methodKey: string, children:ReactNode}) {
  const {t, i18n} = useSubstitutedTranslation();
  const learnLinkKey = `methods.${methodKey}.learn_link`
  const votingMethod = t(`methods.${methodKey}.full_name`)
  return (
    <Box className="resultViewer">
      {children}
      <Typography component="p" sx={{textAlign: 'right', color: '#808080', fontSize: '.8rem', marginTop: '20px'}}>
        {t('results.method_context', {voting_method: votingMethod})}
        {i18n.exists(learnLinkKey) && <><br/><a href={t(learnLinkKey)} style={{color: 'inherit'}}>{t('results.learn_link_text', {voting_method: votingMethod})}</a></>}
      </Typography>
    </Box>
  );
}

function STARPRResultsViewer() {
  const flags = useFeatureFlags();
  let {results} = useRace();
  const {t} = useRace();
  const [sortRound, setSortRound] = useState(undefined);
  const [maxCandidates, setMaxCandidates] = useState(10);
  results = results as allocatedScoreResults;

  const [page, setPage] = useState(1);
  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const tabulationRows = results.summaryData.candidates.map(({name}, index) => {
    return [name].concat(
      (results.summaryData.weightedScoresByRound as Array<number[]>).map(counts => counts[index] == 0? '' : '' + Math.round(counts[index]*10)/10)
    )
  });

  tabulationRows.unshift([t('results.star_pr.table_columns')].concat([...Array(results.summaryData.weightedScoresByRound.length).keys()].map(i =>
    t('results.star_pr.round_column', {n: i+1})
  )))

  const winIndex = (aa) => {
    const i = results.elected.findIndex(e => e.id == aa.id);
    if(i == -1) return results.elected.length;
    return i;
  }

  let sortedCandidates = results.summaryData.candidates
    .map((c,i) => ({...c, index: i}))
    .sort((a, b) => {
      const finalScore = (aa) => results.summaryData.weightedScoresByRound.slice(-1)[0][aa.index]
      if(winIndex(a) != winIndex(b)) return winIndex(a) - winIndex(b);
      return -(finalScore(a) - finalScore(b));
    })

  if(sortRound != undefined){
    sortedCandidates = results.summaryData.candidates
      .map((c,i) => ({...c, index: i}))
      .sort((a, b) => {
        const roundScore = (aa) => results.summaryData.weightedScoresByRound[sortRound-1][aa.index];
        const w = (aa) => winIndex(aa) < sortRound-1 ? winIndex(aa) : 99;
        if(w(a) != w(b)) return w(a) - w(b);
        return -(roundScore(a) - roundScore(b));
      })
  }

  let remainingVoters = (results.summaryData.nTallyVotes*(1 - ((page-1)/results.summaryData.weightedScoresByRound.length)))
  remainingVoters = Math.round(remainingVoters*10)/10;
  const title = t('results.star_pr.chart_title', {n: page})
  return <ResultsViewer methodKey='star_pr'>
    <WidgetContainer>
      <Widget title={title} wide>
        <Typography>
            Chart shows total scores for the {remainingVoters} remaining unrepresented voters
        </Typography>
        {flags.isSet('PR_CONTROLS') && <>
          <Typography sx={{mt: 2}}>Round Selector</Typography>
          <Pagination count={results.summaryData.weightedScoresByRound.length} page={page} onChange={handleChange} />
          <Box display='flex' flexDirection='row' sx={{mb: 7, gap: 2}} >
              <Button variant='outlined' onClick={() => setSortRound(page)}>Sort Candidates</Button>
              <Button variant='outlined' onClick={() => setMaxCandidates(c => c == 10 ? 1000 : 10)}>Toggle Candidate Limit</Button>
          </Box>
        </>}
        <ResultsBarChart
          data={
            results.summaryData.weightedScoresByRound[page-1]
              .map((totalScore, index) => ([totalScore, index]))
              .sort((a, b) => a[0]-b[0])
              .map(([totalScore, index]) =>
                ({
                  name: results.summaryData.candidates[index].name,
                  votes: Math.round(totalScore*10)/10,
                  label: undefined,
                  star: winIndex(results.summaryData.candidates[index]) < page,
                  sortIndex: sortedCandidates.findIndex((c) => c.index == index)
                })
              )
          }
          sortFunc = {(a, b) => Number(a.sortIndex) - Number(b.sortIndex)}
          maxBarSize = {results.summaryData.weightedScoresByRound[0].reduce(
            (prev, totalScore) => Math.max(prev, totalScore), 0
          )}
          maxCandidates = {maxCandidates}
        />
        <Typography>Round Selector</Typography>
        <Pagination count={results.summaryData.weightedScoresByRound.length} page={page} onChange={handleChange} />
      </Widget>
    </WidgetContainer>
    <DetailExpander>
      <WidgetContainer>
        <Widget title={t('results.star_pr.table_title')} wide>
          <ResultsTable className='starPRTable' data={tabulationRows}/>
        </Widget>
      </WidgetContainer>
      <WidgetContainer>
        <Widget title={t('results.star.detailed_steps_title')} wide>
          <div className='detailedSteps'>
            <ol style={{textAlign: 'left'}}>
                {results.logs.map((log, i) => (<li key={i}>
                    {typeof log === 'string' ? log : t(log['key'], log)}
                </li>))}
            </ol>
          </div>
        </Widget>
      </WidgetContainer>
      <DetailExpander level={1}>
        <HeadToHeadWidget/>
        <VoterProfileWidget topScore={5}/>
        {flags.isSet('ALL_STATS') && <ScoreRangeWidget/>}
        {flags.isSet('ALL_STATS') && <ColumnDistributionWidget/>}
        {flags.isSet('ALL_STATS') && <NameRecognitionWidget/>}
      </DetailExpander>
    </DetailExpander>
  </ResultsViewer>
}

function STVResultsViewer() {
  let {results} = useRace();
  const {t} = useRace();
  results = results as irvResults;
  const [page, setPage] = useState(1);
  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const winIndex = (aa) => {
    const i = results.elected.findIndex(e => e.id == aa.id);
    if(i == -1) return results.elected.length;
    return i;
  }

  return <ResultsViewer methodKey='stv'>
    <WidgetContainer>
      <Widget title={t('results.stv.table_title')}>
        <ResultsBarChart
          data={
            [
              ...results.summaryData.candidates.map(c => ({
                name: c.name,
                votes: Math.round(c.hareScores[page-1]*10)/10,
                label: winIndex(c) < page-1 ? '(elected)' : undefined,
                star: winIndex(c) < page,
              })), 
              {
                name: 'Exhausted',
                votes: results.exhaustedVoteCounts[page-1],
                label: undefined,
                star: false,
                sortIndex: 999999
              }
            ]
          }
          sortFunc = {(a, b) => Number(a.sortIndex) - Number(b.sortIndex)}
          maxBarSize = {results.summaryData.candidates.reduce(
            (prev, c) => Math.max(prev, c.hareScores[0]), 0
          )}
        />
        <Pagination count={results.summaryData.candidates[0].hareScores.length} page={page} onChange={handleChange} />
      </Widget>
    </WidgetContainer>
  </ResultsViewer>
}

export default function Results({ race, results }: {race: Race, results: ElectionResults}) {
  const { election } = useElection();
  const showTitleAsTie = ['random', 'five_star', 'head_to_head'].includes(results.tieBreakType);
  // added a null check for sandbox support
  const removeTieBreakFromTitle = (election?.settings.break_ties_randomly ?? false) && results.tieBreakType == 'random';

  const {t} = useSubstitutedTranslation(election?.settings?.term_type ?? 'election', {
    methodKey: {
      'STAR': 'star',
      'Approval': 'approval',
      'Plurality': 'choose_one',
      'IRV': 'rcv',
      'STV': 'stv',
      'STAR_PR': 'star_pr',
      'RankedRobin': 'ranked_robin',
    }[results.votingMethod]
  });

  const winnersText = commaListFormatter
    .format(results.elected.map(c => c.name.replace(' ', '__REPLACE_ME__')))
    .split('__REPLACE_ME__')
    .map((s,i) => ([<React.Fragment key={i*2}>{s}</React.Fragment>, <React.Fragment key={i*2+1}>&nbsp;</React.Fragment>]))
    .flat()
  // this is not exact, but it's enough to judge the threshold
  const winnersLength = results.elected.map(c => c.name).join(' ').length;
  
  return (
    <RaceContextProvider race={race} results={results} t={t}>
      <hr/>
      <Typography variant="h3" component="h3" sx={{marginBottom: 2}}>
          {((election?.title != race.title) || (election?.races.length > 1)) && race.title}
      </Typography>
      <div className="flexContainer" style={{textAlign: 'center'}}>
        <Box sx={{pageBreakAfter:'avoid', pageBreakInside:'avoid', mx: 10}}>
        {results.summaryData.nTallyVotes == 0 && <h2>{t('results.waiting_for_results')}</h2>}
        {results.summaryData.nTallyVotes == 1 && <p>{t('results.single_vote')}</p> }
        {results.summaryData.nTallyVotes > 1 && <>
          {showTitleAsTie?
            <>
            <Typography variant="h5" sx={{fontWeight: 'bold'}}>{t('results.tie_title')}</Typography>
            {!removeTieBreakFromTitle && <Typography component="p" sx={{fontWeight: 'bold'}}>
                {t('results.tiebreak_subtitle', {names: results.elected.map(c => c.name)})}
            </Typography>}
            </>
          :
            <Typography variant='h5'>
            {(winnersLength < 80) ? 
              <>⭐{winnersText}{t('results.win_title_postfix', {count: results.elected.length})} ⭐</>
            :
              [t('results.win_long_title_prefix'), ...results.elected.map(elected => ([<br key={elected.index}/>, `${elected.name}`])).flat()]
            }
            </Typography>
          }
          <Typography variant="h6">{t('results.vote_count', {n: results.summaryData.nTallyVotes})}</Typography>
        </>}
        </Box>
        {results.summaryData.nTallyVotes > 1 &&
          <>
          {results.votingMethod === "STAR" && <STARResultsViewer filterRandomFromLogs={removeTieBreakFromTitle}/>}
          {results.votingMethod === "Approval" && <ApprovalResultsViewer/>}
          {results.votingMethod === "RankedRobin" && <RankedRobinResultsViewer/>}
          {results.votingMethod === "Plurality" && <PluralityResultsViewer/>}
          {results.votingMethod === "IRV" && <IRVResultsViewer/>}
          {results.votingMethod === "STV" && <STVResultsViewer/>}
          {results.votingMethod === "STAR_PR" && <STARPRResultsViewer/>}
        </>}
      </div>
    </RaceContextProvider>
  );
}
