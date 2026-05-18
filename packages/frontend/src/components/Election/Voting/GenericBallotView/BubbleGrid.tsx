import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Typography } from '@mui/material';
import { BallotCandidate, IBallotContext } from '../VotePage';


interface BubbleGridProps {
  ballotContext: IBallotContext;
  columnValues: number[];
  columns: string[];
  numHeaderRows: number;
  onClick: (candidateIndex: number, columnValue: number) => void;
  makeArea: (row: number, column: number, width?: number) => string;
  fontSX: object;
}

type BubbleSemantic = 'radio-per-row' | 'radio-grid' | 'checkbox' | 'pressed';

const RADIO_PER_ROW_METHODS = new Set(['STAR', 'STAR_PR', 'IRV', 'STV', 'RankedRobin']);
// Methods where moving keyboard focus between options should also commit the selection.
// STAR has no side effects from changing a score; IRV/STV/RankedRobin/Plurality would create
// transient duplicate ranks or move the lone vote, so for those we move focus only and require
// Space/Enter to commit.
const SELECT_ON_MOVE_METHODS = new Set(['STAR', 'STAR_PR']);

const gridAreaFor = (makeArea: BubbleGridProps['makeArea'], numHeaderRows: number, candidateIndex: number, columnIndex: number) =>
  // numHeaderRows offsets for the header rows, +1 for 0-indexed candidateIndex, +1 for the gutter row,
  // *3 because each candidate has name row + bubble row + divider row. Column +2 leaves space for the
  // candidate-name column.
  makeArea(numHeaderRows + 1 + 1 + (3 * candidateIndex) + 1, 2 + columnIndex);

function arrowKeyTarget(key: string, currentIndex: number, length: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (currentIndex + 1) % length;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (currentIndex - 1 + length) % length;
    case 'Home':
      return 0;
    case 'End':
      return length - 1;
    default:
      return null;
  }
}

interface BubbleButtonProps {
  ariaLabel: string;
  role: 'radio' | 'checkbox' | 'button';
  ariaChecked?: boolean;
  ariaPressed?: boolean;
  tabIndex?: number;
  className: string;
  gridArea: string;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  label: React.ReactNode;
  fontSX: object;
}

const BubbleButton = React.forwardRef<HTMLButtonElement, BubbleButtonProps>(function BubbleButton(
  { ariaLabel, role, ariaChecked, ariaPressed, tabIndex, className, gridArea, onClick, onKeyDown, label, fontSX },
  ref,
) {
  const ariaProps: Record<string, boolean | string> = {};
  if (role === 'radio' || role === 'checkbox') {
    ariaProps['aria-checked'] = !!ariaChecked;
  } else if (ariaPressed !== undefined) {
    ariaProps['aria-pressed'] = ariaPressed;
  }

  return (
    <button
      ref={ref}
      type="button"
      role={role === 'button' ? undefined : role}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      className={className}
      style={{ gridArea }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...ariaProps}
    >
      <Typography variant="body1" sx={{ ...fontSX }}>
        {label}
      </Typography>
    </button>
  );
});

interface RadioRowGroupProps {
  candidate: BallotCandidate;
  candidateIndex: number;
  columnValues: number[];
  columns: string[];
  selectedScore: number | null;
  rankScoreVote: 'Score' | 'Rank' | 'Vote';
  selectOnMove: boolean;
  onCommit: (candidateIndex: number, columnValue: number) => void;
  classNameFor: (candidateIndex: number, columnValue: number) => string;
  makeArea: BubbleGridProps['makeArea'];
  numHeaderRows: number;
  fontSX: object;
}

function RadioRowGroup({
  candidate,
  candidateIndex,
  columnValues,
  columns,
  selectedScore,
  rankScoreVote,
  selectOnMove,
  onCommit,
  classNameFor,
  makeArea,
  numHeaderRows,
  fontSX,
}: RadioRowGroupProps) {
  const selectedIndex = selectedScore === null ? -1 : columnValues.indexOf(selectedScore);
  const [activeIndex, setActiveIndex] = useState<number>(selectedIndex >= 0 ? selectedIndex : 0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex !== activeIndex) {
      setActiveIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const target = arrowKeyTarget(e.key, currentIndex, columnValues.length);
      if (target === null) return;
      e.preventDefault();
      setActiveIndex(target);
      refs.current[target]?.focus();
      if (selectOnMove) {
        onCommit(candidateIndex, columnValues[target]);
      }
    },
    [columnValues, selectOnMove, onCommit, candidateIndex],
  );

  return (
    <div
      role="radiogroup"
      aria-labelledby={`ballot-candidate-name-${candidate.candidate_id}`}
      style={{ display: 'contents' }}
    >
      {columnValues.map((columnValue, columnIndex) => (
        <BubbleButton
          key={`${candidateIndex}-${columnIndex}`}
          ref={(el) => { refs.current[columnIndex] = el; }}
          role="radio"
          ariaChecked={candidate.score === columnValue}
          ariaLabel={`${rankScoreVote} ${candidate.candidate_name} ${columnValue}`}
          tabIndex={columnIndex === activeIndex ? 0 : -1}
          className={classNameFor(candidateIndex, columnValue)}
          gridArea={gridAreaFor(makeArea, numHeaderRows, candidateIndex, columnIndex)}
          onClick={() => {
            setActiveIndex(columnIndex);
            onCommit(candidateIndex, columnValue);
          }}
          onKeyDown={(e) => handleKeyDown(e, columnIndex)}
          label={columns.length === 1 ? ' ' : columnValue}
          fontSX={fontSX}
        />
      ))}
    </div>
  );
}

interface RadioGridGroupProps {
  candidates: BallotCandidate[];
  columnValue: number;
  columnLabel: string;
  rankScoreVote: 'Score' | 'Rank' | 'Vote';
  raceTitle: string;
  onCommit: (candidateIndex: number, columnValue: number) => void;
  classNameFor: (candidateIndex: number, columnValue: number) => string;
  makeArea: BubbleGridProps['makeArea'];
  numHeaderRows: number;
  fontSX: object;
}

function RadioGridGroup({
  candidates,
  columnValue,
  columnLabel,
  rankScoreVote,
  raceTitle,
  onCommit,
  classNameFor,
  makeArea,
  numHeaderRows,
  fontSX,
}: RadioGridGroupProps) {
  const selectedIndex = candidates.findIndex(c => c.score === columnValue);
  const [activeIndex, setActiveIndex] = useState<number>(selectedIndex >= 0 ? selectedIndex : 0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex !== activeIndex) {
      setActiveIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      const target = arrowKeyTarget(e.key, currentIndex, candidates.length);
      if (target === null) return;
      e.preventDefault();
      setActiveIndex(target);
      refs.current[target]?.focus();
      // No select-on-move for plurality: a single ballot-wide selection means arrowing would
      // overwrite the user's vote as they navigate. Voter must press Space/Enter to commit.
    },
    [candidates.length],
  );

  return (
    <div role="radiogroup" aria-label={raceTitle} style={{ display: 'contents' }}>
      {candidates.map((candidate, candidateIndex) => (
        <BubbleButton
          key={`${candidateIndex}-0`}
          ref={(el) => { refs.current[candidateIndex] = el; }}
          role="radio"
          ariaChecked={candidate.score === columnValue}
          ariaLabel={`${rankScoreVote} ${candidate.candidate_name}`}
          tabIndex={candidateIndex === activeIndex ? 0 : -1}
          className={classNameFor(candidateIndex, columnValue)}
          gridArea={gridAreaFor(makeArea, numHeaderRows, candidateIndex, 0)}
          onClick={() => {
            setActiveIndex(candidateIndex);
            onCommit(candidateIndex, columnValue);
          }}
          onKeyDown={(e) => handleKeyDown(e, candidateIndex)}
          label={columnLabel}
          fontSX={fontSX}
        />
      ))}
    </div>
  );
}

const BubbleGrid: React.FC<BubbleGridProps> = ({ ballotContext, columnValues, columns, numHeaderRows, onClick, makeArea, fontSX }) => {
  const { candidates, instructionsRead, alertBubbles } = ballotContext;
  const votingMethod = ballotContext.race.voting_method;
  const rankScoreVote: 'Score' | 'Rank' | 'Vote' =
    votingMethod === 'Approval' || votingMethod === 'Plurality'
      ? 'Vote'
      : votingMethod === 'STAR' || votingMethod === 'STAR_PR'
      ? 'Score'
      : 'Rank';

  const semantic: BubbleSemantic = RADIO_PER_ROW_METHODS.has(votingMethod)
    ? 'radio-per-row'
    : votingMethod === 'Plurality'
    ? 'radio-grid'
    : votingMethod === 'Approval'
    ? 'checkbox'
    : 'pressed';

  const classNameFor = useCallback((candidateIndex: number, columnValue: number) => {
    let cls = 'circle';
    if (instructionsRead) cls += ' unblurred';
    if (alertBubbles && alertBubbles.some(([ci, cv]) => ci === candidateIndex && cv === columnValue)) {
      cls += ' alert';
    } else if (columnValue === candidates[candidateIndex].score) {
      cls += ' filled';
    }
    return cls;
  }, [candidates, instructionsRead, alertBubbles]);

  if (semantic === 'radio-per-row') {
    const selectOnMove = SELECT_ON_MOVE_METHODS.has(votingMethod);
    return (
      <>
        {candidates.map((candidate, candidateIndex) => (
          <RadioRowGroup
            key={`row-${candidate.candidate_id}`}
            candidate={candidate}
            candidateIndex={candidateIndex}
            columnValues={columnValues}
            columns={columns}
            selectedScore={candidate.score ?? null}
            rankScoreVote={rankScoreVote}
            selectOnMove={selectOnMove}
            onCommit={onClick}
            classNameFor={classNameFor}
            makeArea={makeArea}
            numHeaderRows={numHeaderRows}
            fontSX={fontSX}
          />
        ))}
      </>
    );
  }

  if (semantic === 'radio-grid') {
    return (
      <RadioGridGroup
        candidates={candidates}
        columnValue={columnValues[0]}
        columnLabel={columns.length === 1 ? ' ' : String(columnValues[0])}
        rankScoreVote={rankScoreVote}
        raceTitle={ballotContext.race.title}
        onCommit={onClick}
        classNameFor={classNameFor}
        makeArea={makeArea}
        numHeaderRows={numHeaderRows}
        fontSX={fontSX}
      />
    );
  }

  // checkbox (Approval) and pressed fallback — each bubble is independent, tab order moves
  // between candidates naturally, no roving tabindex needed.
  return (
    <>
      {candidates.map((candidate, candidateIndex) =>
        columnValues.map((columnValue, columnIndex) => {
          const isSelected = candidate.score === columnValue;
          return (
            <BubbleButton
              key={`${candidateIndex}-${columnIndex}`}
              role={semantic === 'checkbox' ? 'checkbox' : 'button'}
              ariaChecked={semantic === 'checkbox' ? isSelected : undefined}
              ariaPressed={semantic === 'pressed' ? isSelected : undefined}
              ariaLabel={`${rankScoreVote} ${candidate.candidate_name} ${rankScoreVote !== 'Vote' ? columnValue : ''}`}
              className={classNameFor(candidateIndex, columnValue)}
              gridArea={gridAreaFor(makeArea, numHeaderRows, candidateIndex, columnIndex)}
              onClick={() => onClick(candidateIndex, columnValue)}
              label={columns.length === 1 ? ' ' : columnValue}
              fontSX={fontSX}
            />
          );
        })
      )}
    </>
  );
};

export default BubbleGrid;
