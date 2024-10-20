import React, { useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Candidate } from '@equal-vote/star-vote-shared/domain_model/Candidate';
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

  const candidateColumnPairsNested = useMemo(() => {
    return candidates.map((_, candidateIndex) =>
      columnValues.map((columnValue, columnIndex) =>
        [candidateIndex, columnIndex, columnValue]
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
      {candidateColumnPairsFlat.map(([candidateIndex, columnIndex, columnValue]) => (
        <Box
          key={`${candidateIndex}-${columnIndex}`}
          className={className(candidateIndex, columnValue)}
          onClick={() => onClick(candidateIndex, columnValue)}
          sx={{
            margin: 'auto',
            //For Rows:
            //numHeaderRows offsets grid to account for header rows
            //+1 offsets grid to account for candidateIndex starting at 0
            //+1 offsets grid to account for gutter row
            //*2 offsets grid to account for the two rows per candidate
            //For Columns:
            //+2 offsets grid to account for header column (candidate name)
            gridArea: makeArea(numHeaderRows + 1 + 1 + (2 * candidateIndex), 2 + columnIndex),
          }}
        >
          <Typography variant='body1' sx={{ ...fontSX }}>
            {columns.length === 1 ? ' ' : columnValue}
          </Typography>
        </Box>
      ))
      }
    </>
  );
};

export default BubbleGrid;
