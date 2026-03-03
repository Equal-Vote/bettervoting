import StarBallotView from "./StarBallotView";
import PluralityBallotView from "./PluralityBallotView";
import RankedBallotView from "./RankedBallotView";
import ApprovalBallotView from "./ApprovalBallotView";
import StarPRBallotView from "./StarPRBallotView";

interface BallotPageSelectorProps {
  votingMethod: string;
}

export default function BallotPageSelector({votingMethod}: BallotPageSelectorProps) {
  // TODO: it would be more scalable if we selected the class from a dictionary, but I'm not sure how to do that in react
  return (
    <>
      {votingMethod == 'STAR' && <StarBallotView/>}
      {votingMethod == 'STAR_PR' && <StarPRBallotView/>}
      {votingMethod == 'Plurality' && <PluralityBallotView/>}
      {(votingMethod == 'RankedRobin' || votingMethod == 'IRV' || votingMethod == 'STV') && <RankedBallotView/>}
      {votingMethod == 'Approval' && <ApprovalBallotView/>}
    </>
  );
}
