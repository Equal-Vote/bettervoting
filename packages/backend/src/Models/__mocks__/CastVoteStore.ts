import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { ILoggingContext } from "../../Services/Logging/ILogger";
import { IBallotStore } from "../IBallotStore";
import { IElectionRollStore } from "../IElectionRollStore";

export default class CastVoteStore {

    _ballotStore:IBallotStore;
    _rollStore:IElectionRollStore;

    constructor(ballotStore:IBallotStore, rollStore:IElectionRollStore) {
        this._ballotStore = ballotStore;
        this._rollStore = rollStore;
    }

    async submitBallotEvent(event: any, ctx: ILoggingContext): Promise<void> {
        if (event.roll) {
            const currentRoll = await this._rollStore.getByVoterID(event.roll.election_id, event.roll.voter_id, ctx);
            if (currentRoll && currentRoll.submitted && !event.isBallotUpdate) {
                throw new Error("ALREADY_VOTED");
            }
        }

        if (event.isBallotUpdate) {
            await this._ballotStore.updateBallot(event.inputBallot, ctx, `User updates a ballot`);
        } else {
            await this._ballotStore.submitBallot(event.inputBallot, ctx, `User submits a ballot`);
        }

        if (event.roll) {
            event.roll.submitted = true;
            await this._rollStore.update(event.roll, ctx, `User submits a ballot`);
        }
    }

}