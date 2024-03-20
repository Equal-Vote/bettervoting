import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";

export interface Database {
    electionDB: Election,
    electionRollDB: ElectionRoll
    ballotDB: Ballot
}