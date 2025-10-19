import { useContext, useMemo, useCallback } from 'react';
import { BallotContext } from './VotePage';
import GenericBallotView from './GenericBallotView/GenericBallotView';
import DraggableIRVBallotView from './DraggableIRVBallotView';
import { useSubstitutedTranslation } from '~/components/util';
import useElection from '../../ElectionContextProvider'; 


export default function RankedBallotView({ onlyGrid = false }: { onlyGrid?: boolean }) {
  const ballotContext = useContext(BallotContext);
  const { election } = useElection();
  const { t } = useSubstitutedTranslation();

  // Use draggable component for IRV when draggable_ballot setting is enabled
  if (ballotContext.race.voting_method === 'IRV' && election.settings.draggable_ballot && !onlyGrid) {
    return <DraggableIRVBallotView />;
  }


  // disabling warnings until we have a better solution, see slack convo
  // https://starvoting.slack.com/archives/C01EBAT283H/p1677023113477139
  // if(race.voting_method == 'IRV' && scoresAreOverVote({scores: scores})){
  //   warning=(
  //     <>
  //     Giving multiple candidates the same ranking is not recommended in IRV.<br/>
  //     This could result in your ballot getting exhausted early
  //     </>
  //   )
  //  }  

  const maxRankings = useMemo(() => {
    const MAX_BALLOT_RANKS = Number(process.env.REACT_APP_MAX_BALLOT_RANKS) ? Number(process.env.REACT_APP_MAX_BALLOT_RANKS) : 8;
    const DEFAULT_BALLOT_RANKS = Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) ? Number(process.env.REACT_APP_DEFAULT_BALLOT_RANKS) : 6;
    if (ballotContext.maxRankings) {
      return Math.min(ballotContext.maxRankings, MAX_BALLOT_RANKS);
    } else {
      return DEFAULT_BALLOT_RANKS;
    }
  }, [ballotContext.maxRankings]);
  const findSkippedColumns = useCallback((scores: number[]): number[] | undefined => {
    const skippedColumns: number[] = [];
    for (let i = 1; i <= maxRankings; i++) {
      if (!scores.includes(i) && scores.some(score => score > i)) {
        skippedColumns.push(i);
      }
    }
    return skippedColumns.length ? skippedColumns : undefined;
  }, [maxRankings]);
    const findMatchingScores = useCallback((scores: number[]): [number, number][] | undefined => {
    const scoreMap = new Map();
  
    // Populate the map with indexes for each score
    scores.forEach((score, index) => {
      if (scoreMap.has(score)) {
        scoreMap.get(score).push(index);
      } else if (score) {
        scoreMap.set(score, [index]);
      }
    });
  
    // Filter out entries with only one index
    const matchingScores= []
    scoreMap.forEach((indexes, score) => {
      if (indexes.length > 1) {
        indexes.map(index => matchingScores.push([index, score]))
      }
    });

    return matchingScores.length ? matchingScores : undefined;
  }, []);
   const getWarnings = useCallback((skippedColumns, matchingScores):{severity: 'warning' | 'error', message:string}[] | undefined=> {
    const warnings: {severity: 'warning' | 'error', message:string}[] = [];
    if (skippedColumns) {
      warnings.push({ message: t('ballot.warnings.skipped_rank'), severity: "warning" });
    } 
    if (matchingScores) {
      warnings.push({ message: t('ballot.warnings.duplicate_rank'), severity: "error" });
    }
    return warnings.length ? warnings : undefined;
  }, [t]);
 const race = useMemo(() => ballotContext.race, [ballotContext.race]);


  const onClick = useCallback((candidateIndex, columnValue) => {
    // If the candidate already has the score, remove it. Otherwise, set it with the new score.
    const scores = ballotContext.candidates.map((candidate) => candidate.score);
    scores[candidateIndex] = scores[candidateIndex] === columnValue ? null : columnValue;
      const skippedColumns = findSkippedColumns(scores);
      let matchingScores: [number, number][] | undefined = undefined;
      if (ballotContext.race.voting_method === 'IRV') {
        matchingScores = findMatchingScores(scores);
      }
      const warnings = getWarnings(skippedColumns, matchingScores);
      ballotContext.setWarningColumns(skippedColumns);
      ballotContext.setAlertBubbles(matchingScores);
      ballotContext.setWarnings(warnings);
    // }
    
    ballotContext.onUpdate(scores);
  }, [race.voting_method, ballotContext]);


  const columnValues = useMemo(() => {
    return ballotContext.candidates.slice(0, maxRankings).map((c, i) => i + 1);
  }, [ballotContext.candidates, maxRankings]);

  const columns = useMemo(() => {
    return columnValues.map(v => t('number.rank', { count: v, ordinal: true }));
  }, [columnValues, t]);

  return (
    <GenericBallotView
      key="rankedBallot"
      methodKey={
        (ballotContext.race.voting_method === 'IRV' ? 'rcv' : '') +
        (ballotContext.race.voting_method === 'RankedRobin' ? 'ranked_robin' : '') + 
        (ballotContext.race.voting_method === 'STV' ? 'stv' : '')
      }
      columnValues={columnValues}
      columns={columns}
      onClick={onClick}
      onlyGrid={onlyGrid}
    />
  );
}