import React, { useContext } from "react";
import GenericBallotView from "./GenericBallotView/GenericBallotView";
import Typography from '@mui/material/Typography';
import { BallotContext } from "./VotePage";

// Renders a complete RCV ballot for a single race
export default function ApprovalBallotView({onlyGrid=false}) {
  const ballotContext = useContext(BallotContext);

  return (
    <GenericBallotView
      columns={[1]}
      methodKey='approval'
      onClick={(row, score) => {
        const newScores = ballotContext.candidates.map(c => c.score);
        newScores[row] = newScores[row] === score ? null : score;
        ballotContext.onUpdate(newScores);
      }}
      onlyGrid={onlyGrid}
    />
  );
}
