import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';

export interface DevElectionDefinition {
    electionId: string;
    election: Election;
    makeBallots: () => Ballot[];
}
