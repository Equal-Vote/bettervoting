import React, { useContext, useMemo, useState } from 'react';
import { Box, Paper, Typography, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { BallotContext } from './VotePage';
import { useSubstitutedTranslation } from '~/components/util';
import useElection from '../../ElectionContextProvider';
import { BallotCandidate } from './VotePage';
import { FormattedDescription } from '~/components/FormattedDescription';

type Score = number | null;

function CandidateCard({ name }: { name: string }) {
  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        p: 2,
        mb: 1,
        userSelect: 'none',
        backgroundColor: 'background.paper',
        color: 'text.primary',
        '&:hover': { backgroundColor: 'action.hover' },
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', flex: 1 }}>
        <Typography variant="body2" aria-label={name}>
          {name}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function DraggableIRVBallotView() {
  const ballotContext = useContext(BallotContext);
  const { t } = useSubstitutedTranslation();
  const { election } = useElection();

  // Split ranked vs unranked from current context scores
  const { unrankedCandidates, rankedCandidates } = useMemo(() => {
    const ranked: (BallotCandidate & { rank: number })[] = [];
    const unranked: BallotCandidate[] = [];
    ballotContext.candidates.forEach(c => {
      const s = c.score;
      if (typeof s === 'number' && s > 0) ranked.push({ ...c, rank: s });
      else unranked.push(c);
    });
    ranked.sort((a, b) => a.rank - b.rank);
    return { unrankedCandidates: unranked, rankedCandidates: ranked };
  }, [ballotContext.candidates]);

  const rankedIds = useMemo(() => rankedCandidates.map(c => c.candidate_id.toString()), [rankedCandidates]);

  // Track display order of unranked candidates independently so reordering is preserved
  const [unrankedOrder, setUnrankedOrder] = useState<string[]>(() =>
    ballotContext.candidates
      .filter(c => !(typeof c.score === 'number' && c.score > 0))
      .map(c => c.candidate_id.toString())
  );

  const orderedUnrankedCandidates = useMemo(() => {
    const map = new Map(unrankedCandidates.map(c => [c.candidate_id.toString(), c]));
    return unrankedOrder.filter(id => map.has(id)).map(id => map.get(id)!);
  }, [unrankedCandidates, unrankedOrder]);

  const commitScoresFromOrder = React.useCallback((order: string[]) => {
    const m = new Map<string, number>();
    order.forEach((id, idx) => m.set(id, idx + 1));
    const scores: Score[] = ballotContext.candidates.map(c => (m.get(c.candidate_id.toString()) ?? null) as Score);
    ballotContext.onUpdate(scores);
  }, [ballotContext.candidates, ballotContext.onUpdate]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId;
    const to = destination.droppableId;
    const id = draggableId;

    if (from === 'unranked' && to === 'unranked') {
      // Reorder within unranked
      setUnrankedOrder(prev => {
        const next = prev.filter(x => x !== id);
        next.splice(destination.index, 0, id);
        return next;
      });
      return;
    }

    if (to === 'unranked') {
      // Move from ranked to unranked at drop position
      setUnrankedOrder(prev => {
        const next = prev.filter(x => x !== id);
        next.splice(destination.index, 0, id);
        return next;
      });
      commitScoresFromOrder(rankedIds.filter(x => x !== id));
      return;
    }

    if (to === 'ranked') {
      // Move from unranked to ranked; remove from unranked order
      setUnrankedOrder(prev => prev.filter(x => x !== id));
      const base = rankedIds.filter(x => x !== id);
      const insertAt = Math.max(0, Math.min(base.length, destination.index));
      commitScoresFromOrder([...base.slice(0, insertAt), id, ...base.slice(insertAt)]);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box border={2} sx={{ mt: 0, ml: 0, mr: 0, width: '100%' }} className="ballot">
      <Box sx={{ p: 3 }}>
        <Typography align="center" variant="h5" component="h4" fontWeight="bold" sx={{ mb: 2 }}>
          {ballotContext.race.title}
        </Typography>

        {ballotContext.race.description && (
          <FormattedDescription
            description={ballotContext.race.description}
            align="center"
            sx={{ mb: 3 }}
          />
        )}

        {(() => {
          const numWinners = ballotContext.race.num_winners;
          const spelled = numWinners <= 10 ? t(`spelled_numbers.${numWinners}`) : numWinners;
          const methodName = t('methods.rcv.full_name');
          return (
            <Box sx={{ mb: 3 }}>
              <Typography align="center" sx={{ typography: { sm: 'body1', xs: 'body2' } }}>
                {t('ballot.this_election_uses_draggable', {
                  voting_method: methodName,
                  count: numWinners,
                  spelled_count: spelled,
                })}
              </Typography>
              <Typography align="center" sx={{ mt: 1, typography: { sm: 'body1', xs: 'body2' } }}>
                {t('ballot.instructions_rcv_draggable', 'Drag candidates left → right. Rank 1 is your top choice. Unranked means no preference.')}
              </Typography>
              {election?.settings?.require_instruction_confirmation && (
                <FormGroup>
                  <FormControlLabel
                    sx={{ pt: 1, justifyContent: 'center' }}
                    control={
                      <Checkbox
                        disabled={ballotContext.instructionsRead}
                        checked={ballotContext.instructionsRead}
                        onChange={() => ballotContext.setInstructionsRead()}
                      />
                    }
                    label={t('ballot.instructions_checkbox')}
                  />
                </FormGroup>
              )}
            </Box>
          );
        })()}

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 3,
          alignItems: 'start',
          filter: ballotContext.instructionsRead ? '' : 'blur(.4rem)',
          pointerEvents: ballotContext.instructionsRead ? 'auto' : 'none'
        }}>
          {/* Left Column - Unranked */}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" gutterBottom align="right">
              {t('ballot.available', 'Available Candidates')}
            </Typography>
            <Droppable droppableId="unranked">
              {(provided, snapshot) => (
                <Paper elevation={0}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  aria-label={t('ballot.available', 'Available Candidates')}
                  sx={{
                    p: 2,
                    minHeight: 80,
                    backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'background.default',
                    border: 'none',
                  }}
                >
                  {orderedUnrankedCandidates.map((c, index) => (
                    <Draggable key={c.candidate_id} draggableId={c.candidate_id.toString()} index={index}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          style={{
                            ...(prov.draggableProps.style as React.CSSProperties),
                            width: snapshot.isDragging ? (prov.draggableProps.style as any)?.width : '100%'
                          }}
                          aria-roledescription="Draggable"
                          aria-labelledby={`cand-${c.candidate_id}`}
                        >
                          <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', columnGap: 1, minWidth: 0, width: '100%' }}>
                            {/* Hidden gutter to match ranked layout and avoid jitter */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', minHeight: 48, py: 2, mb: 1, opacity: 0 }}>
                              <Typography variant="subtitle2">0</Typography>
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Box component="span" id={`cand-${c.candidate_id}`} sx={{ display: 'block', width: '100%', minWidth: 0 }}>
                                <CandidateCard name={c.candidate_name} />
                              </Box>
                            </Box>
                          </Box>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {orderedUnrankedCandidates.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                      {t('ballot.no_available', 'No available candidates')}
                    </Typography>
                  )}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Box>

          {/* Right Column - Ranked */}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" gutterBottom>
              {t('ballot.yourRankings', 'Your Rankings')}
            </Typography>
            <Droppable droppableId="ranked">
              {(provided, snapshot) => (
                <Paper elevation={0}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  role="listbox"
                  aria-label={t('ballot.yourRankings', 'Your Rankings')}
                  sx={{
                    p: 2,
                    minHeight: 80,
                    backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'background.default',
                    border: rankedCandidates.length > 0 ? 'none' : '2px dashed',
                    borderColor: rankedCandidates.length > 0 ? 'transparent' : 'divider',
                  }}
                >
                  {rankedCandidates.map((c, index) => (
                    <Draggable key={c.candidate_id} draggableId={c.candidate_id.toString()} index={index}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          style={{
                            ...(prov.draggableProps.style as React.CSSProperties),
                            width: snapshot.isDragging ? (prov.draggableProps.style as any)?.width : '100%'
                          }}
                          role="option"
                          aria-roledescription="Draggable"
                          aria-posinset={index + 1}
                          aria-setsize={rankedCandidates.length}
                          aria-labelledby={`cand-${c.candidate_id}`}
                        >
                          <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', columnGap: 1, minWidth: 0, width: '100%' }}>
                            <Box
                              aria-hidden
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'text.secondary',
                                minHeight: 48,
                                py: 2,
                                mb: 1,
                                opacity: snapshot.isDragging ? 0 : 1,
                              }}
                            >
                              <Typography variant="subtitle2">{index + 1}</Typography>
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Box component="span" id={`cand-${c.candidate_id}`} sx={{ display: 'block', width: '100%', minWidth: 0 }}>
                                <CandidateCard name={c.candidate_name} />
                              </Box>
                            </Box>
                          </Box>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {rankedCandidates.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                      {t('ballot.drop_here', 'Drop candidates here to rank them')}
                    </Typography>
                  )}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Box>
        </Box>
      </Box>
      </Box>
    </DragDropContext>
  );
}
