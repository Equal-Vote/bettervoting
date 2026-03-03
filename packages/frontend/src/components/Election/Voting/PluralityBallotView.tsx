import { useContext } from "react";
import GenericBallotView from "./GenericBallotView/GenericBallotView";
import { BallotContext } from "./VotePage";

// Renders a complete RCV ballot for a single race
export default function PluralityBallotView() {
  const ballotContext = useContext(BallotContext);

  return (
    <GenericBallotView
      columns={['1']}
      methodKey='choose_one'
      onClick={(row, score) => {
        const newScores = ballotContext.candidates.map(c => c.score);
        // bubble becomes null
        if(newScores[row] === score){
          newScores[row] = null

        // bubble becomes 1, all others become 0
        }else{
          for(let i = 0; i < newScores.length; i++){
            newScores[i] = (i===row)? score : null;
          }
        }
        ballotContext.onUpdate(newScores);
      }}
    />
  );
}
