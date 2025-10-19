import { Election, PartialBy, getApprovedRaces } from "./Election";
import { ElectionRoll } from "./ElectionRoll";
import { Race } from "./Race";
import { Score } from "./Score";
import { Uid } from "./Uid";
import { OrderedVote, Vote } from "./Vote";

export interface NewBallotWithVoterID {
    voter_id: string;
    ballot: OrderedNewBallot;
}
export interface Ballot {
    ballot_id:  Uid; //ID if ballot
    election_id: Uid; //ID of election ballot is cast in
    user_id?: Uid; //ID of user who cast ballot TODO: replace with voter ID
    status: string; //Status of string (saved, submitted)
    date_submitted: number; //time ballot was submitted, represented as unix timestamp (Date.now())
    ip_hash?: string; // ip address if once_per_ip is enabled
    votes: Vote[];         // One per poll
    history?: BallotAction[];
    precinct?: string; // Precint of voter
    create_date:    Date | string; // Date this object was created
    update_date:    Date | string;  // Date this object was last updated
    head:           boolean;// Head version of this object
}

export interface RaceCandidateOrder {
    race_id: Uid;
    candidate_id_order: Uid[];
}

export interface NewBallot extends PartialBy<Ballot,'ballot_id'|'create_date'|'update_date'|'head'> {}

export interface OrderedNewBallot extends PartialBy<NewBallot,'votes'> {
    orderedVotes: OrderedVote[]
}

export interface AnonymizedBallot {
    ballot_id:  Uid;    //ID of ballot
    election_id: Uid;   //ID of election ballot is cast in
    votes: Vote[];      // One per poll
    precinct?: string;  // Precint of voter
}

export interface BallotAction {
    action_type:string;
    actor:Uid;
    timestamp:number;
}

export interface BallotSubmitStatus {
    voter_id:string;
    success:boolean;
    message:string;
}


export function ballotValidation(election: Election, obj:NewBallot): string | null {
    if (!obj){
        return "Ballot is null";
    }
    //TODO - currently some disagreement on the type of the Election Id...
    //technically Uid expects a string, but the DB currently using numbers
    if (!obj.election_id || typeof obj.election_id !== 'string'){
        return `(ballot) Invalid Election ID ${obj.election_id}`;
    }
    if (!obj.votes){
        return "Invalid Votes";
    }
    const approvedRaces = getApprovedRaces(election, obj.precinct)
    const approvedRaceIds = approvedRaces.map((race: Race) => race.race_id)
    const ballotRaceIds = obj.votes.map((vote: Vote) => vote.race_id)
    const hasDuplicates = new Set(ballotRaceIds).size !== ballotRaceIds.length
    // Checks if ballot has duplicate votes for the same race
    if (hasDuplicates) {
        return "Duplicate votes";
    }

    // Checks that all race ids on voter's ballot are in list of races that voter is allowed to vote in
    const validIds = ballotRaceIds.every(id => approvedRaceIds.includes(id))
    if (!validIds) {
        return "Invalid IDs";
    }
    const maxRankings = election.settings.max_rankings
    
    let outOfBoundsError = ''
    obj.votes.forEach(vote => {
    //Checks if the score exceeds max_rankings or number of candidates for ranked elections
        const race = approvedRaces.find(race => race.race_id === vote.race_id)
        if (!race) {
            return
        }
        if (['RankedRobin', 'IRV', 'STV'].includes(race.voting_method)) {
            const numCandidates = race.candidates.length;
            vote.scores.forEach(score => {
                // Arend: Removing check against numCandidates, that's not necessarily true for public RCV elections
                    if (score && /*score.score > numCandidates ||*/ (maxRankings && score.score > maxRankings) || score.score < 0) {
                        outOfBoundsError +=  `Race: ${race.title}, Score: ${score.score}; `;
                    }
                })
        }

        //Checks if the score exceeds 5 for STAR and STAR_PR elections
         else  if ([ 'STAR', 'STAR_PR'].includes(race.voting_method)) {
            vote.scores.forEach(score => {
                    if (score && score.score > 5 || score.score < 0) {
                        outOfBoundsError +=  `Race: ${race.title}, Score: ${score.score}; `;
                    }
                })
            }
        //Checks if the score exceeds 1 for Approval and Plurality elections
         else if (['Approval', 'Plurality'].includes(race.voting_method)) {
            vote.scores.forEach(score => {
                    if (score && score.score > 1 || score.score < 0) {
                        outOfBoundsError +=  `Race: ${race.title}, Score: ${score.score}; `;
                    }
                })
            }
        
    });
    if (outOfBoundsError !== '') {
        return "The following races have scores that are out of bounds: " + outOfBoundsError;
    }
    return null;
  }
