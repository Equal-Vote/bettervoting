import React, { useContext } from "react";
import GenericBallotView from "./GenericBallotView/GenericBallotView";
import Typography from '@mui/material/Typography';
import { BallotContext } from "./VotePage";

function scoresAreUnderVote({scores}){
  let five_selected = false
  let zero_selected = false
  let all_null = true
  for(let i = 0; i < scores.length; i++){
    if(scores[i] != null) all_null = false
    if(scores[i] == null || scores[i] == 0) zero_selected = true
    if(scores[i] == 5) five_selected = true
  }
  return !(all_null || (five_selected && zero_selected))
}

// Renders a complete RCV ballot for a single race
export default function StarBallotView({onlyGrid=false}) {
  const ballotContext = useContext(BallotContext);

  let warning = null;

  // disabling warnings until we have a better solution, see slack convo
  // https://starvoting.slack.com/archives/C01EBAT283H/p1677023113477139
  //if(scoresAreUnderVote({scores: scores})){
  //  warning=(
  //    <>
  //    Under STAR voting it's recommended to leverage the full voting scale in order to maximize the power of your vote
  //    </>
  //  )
  //}
  return (
    <GenericBallotView
      methodKey="star"
      columns={[0, 1, 2, 3, 4, 5]}
      onClick={(i, j) => {
        const newScores = ballotContext.candidates.map(c => c.score);
        newScores[i] = newScores[i] === j ? null : j;
        ballotContext.onUpdate(newScores);
      }}
      starHeadings={true}
      warning={warning}
      onlyGrid={onlyGrid}
    />
  );
}

