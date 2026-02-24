import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';

export interface DevElectionDefinition {
    electionId: string;
    election: Election;
    makeBallots: () => Ballot[];
}

export function devBallotId(electionId: string, index: number): string {
    return `b-${electionId}-ballot${index}`;
}

export function validateDefinition(def: DevElectionDefinition): void {
    if (!def.electionId.startsWith('devtest')) {
        throw new Error(`Election ID "${def.electionId}" must start with "devtest"`);
    }
    if (def.election.election_id !== def.electionId) {
        throw new Error(`Election ID mismatch: definition says "${def.electionId}" but election object says "${def.election.election_id}"`);
    }
    const expectedPrefix = `b-${def.electionId}-ballot`;
    const ballots = def.makeBallots();
    for (const ballot of ballots) {
        if (!ballot.ballot_id.startsWith(expectedPrefix)) {
            throw new Error(`Ballot ID "${ballot.ballot_id}" must start with "${expectedPrefix}" — use devBallotId() to generate ballot IDs`);
        }
    }
}
