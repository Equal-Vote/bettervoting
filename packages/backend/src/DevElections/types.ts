import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { EmailEvent } from '@equal-vote/star-vote-shared/domain_model/EmailEvent';
import { devBallotId, validateDevElectionId, validateDevBallotId } from '@equal-vote/star-vote-shared/utils/makeID';

export { devBallotId };

export interface DevElectionDefinition {
    electionId: string;
    election: Election;
    makeBallots: () => Ballot[];
    makeElectionRolls?: () => ElectionRoll[];
    makeEmailEvents?: () => Omit<EmailEvent, 'id'>[];
}

export function validateDefinition(def: DevElectionDefinition): void {
    validateDevElectionId(def.electionId);
    if (def.election.election_id !== def.electionId) {
        throw new Error(`Election ID mismatch: definition says "${def.electionId}" but election object says "${def.election.election_id}"`);
    }
    const ballots = def.makeBallots();
    for (const ballot of ballots) {
        validateDevBallotId(ballot.ballot_id, def.electionId);
    }
}
