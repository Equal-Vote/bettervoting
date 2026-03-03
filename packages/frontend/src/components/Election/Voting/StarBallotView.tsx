import { useContext } from "react";
import GenericBallotView from "./GenericBallotView/GenericBallotView";
import { BallotContext } from "./VotePage";


// Renders a complete RCV ballot for a single race
export default function StarBallotView({onlyGrid=false}:{onlyGrid?: boolean}) {
  const ballotContext = useContext(BallotContext);


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
      columns={['0', '1', '2', '3', '4', '5']}
      onClick={(i, j) => {
        const newScores = ballotContext.candidates.map(c => c.score);
        newScores[i] = newScores[i] === j ? null : j;
        ballotContext.onUpdate(newScores);
      }}
      starHeadings={true}
      onlyGrid={onlyGrid}
    />
  );
}

