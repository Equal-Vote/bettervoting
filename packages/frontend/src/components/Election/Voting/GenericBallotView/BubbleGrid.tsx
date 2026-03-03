import React, { useCallback, useMemo } from 'react';
import {  Typography } from '@mui/material';
import { IBallotContext } from '../VotePage';


interface BubbleGridProps {
  ballotContext: IBallotContext;
  columnValues: number[];
  columns: string[];
  numHeaderRows: number;
  onClick: (candidateIndex: number, columnValue: number) => void;
  makeArea: (row: number, column: number, width?: number) => string;
  fontSX: object;
}



const BubbleGrid: React.FC<BubbleGridProps> = ({ ballotContext, columnValues, columns, numHeaderRows, onClick, makeArea, fontSX }) => {
  const { candidates, instructionsRead, alertBubbles } = ballotContext;
  // Step 1: Create a triplet of candidateIndex, columnIndex, and columnValue for each candidate
  const rankScoreVote = ballotContext.race.voting_method === 'Approval' || ballotContext.race.voting_method === 'Plurality'
    ? 'Vote'
    : ballotContext.race.voting_method === 'STAR' || ballotContext.race.voting_method === 'STAR_PR'
    ? 'Score'
    : 'Rank';
  const candidateColumnPairsNested = useMemo(() => {
    return candidates.map((candidate, candidateIndex) =>
      columnValues.map((columnValue, columnIndex) =>
        [candidateIndex, columnIndex, columnValue, candidate.candidate_name] as [number, number, number, string] // Add candidate name for accessibility
      )
    );
  }, [candidates, columnValues]);

  // Step 2: Flatten the nested array into a single array of triplets
  const candidateColumnPairsFlat = useMemo(() => candidateColumnPairsNested.flat(), [candidateColumnPairsNested]);
  const className = useCallback((candidateIndex: number, columnValue: number) => {
    let className = 'circle';
    if (instructionsRead) {
      className = className + ' unblurred';
    }
    if (alertBubbles && alertBubbles.some(([alertCandidateIndex, alertColumnValue]) => alertCandidateIndex === candidateIndex && alertColumnValue === columnValue)) {
      className = className + ' alert';
    } else if (columnValue === candidates[candidateIndex].score) {
      className = className + ' filled';
    }

    return className;
  }, [candidates, instructionsRead, alertBubbles]);


  // Step 3: Map over the flattened array to render the Box components
  return (
    <>
      {candidateColumnPairsFlat.map(([candidateIndex, columnIndex, columnValue, candidate_name]) => (
        <button
          key={`${candidateIndex}-${columnIndex}`}
          role='button'
          aria-label={`${rankScoreVote} ${candidate_name} ${rankScoreVote != 'Vote' ? columnValue : ''}`}
          className={className(candidateIndex, columnValue)}
          onClick={() => onClick(candidateIndex, columnValue)}
          style={{
            //For Rows:
            //numHeaderRows offsets grid to account for header rows
            //+1 offsets grid to account for candidateIndex starting at 0
            //+1 offsets grid to account for gutter row
            //*2 offsets grid to account for the two rows per candidate
            //For Columns:
            //+2 offsets grid to account for header column (candidate name)
            gridArea: makeArea(numHeaderRows + 1 + 1 + (3 * candidateIndex) + 1, 2 + columnIndex),
          }}
        >
          <Typography variant='body1' sx={{ ...fontSX }}>
            {columns.length === 1 ? ' ' : columnValue}
          </Typography>
        </button>
      ))
      }
    </>
  );
};

export default BubbleGrid;
