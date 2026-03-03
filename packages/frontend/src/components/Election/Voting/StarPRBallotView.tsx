import { useContext } from "react";
import GenericBallotView from "./GenericBallotView/GenericBallotView";
import { BallotContext } from "./VotePage";

// Renders a complete RCV ballot for a single race

export default function StarPRBallotView({onlyGrid=false}: {onlyGrid?: boolean}) {
  const ballotContext = useContext(BallotContext);
  
  // const footer = (
  //   <Typography align='center' component="p">
  //     Winners in Proportional STAR Voting are selected in rounds. Each round elects the candidate with the highest total score, then designates that candidate's strongest supporters are represented. Subsequent rounds include all voters who are not yet fully represented.
  //   </Typography>
  // )

  return (
    <GenericBallotView
      methodKey="star_pr"
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

