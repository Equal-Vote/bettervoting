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
            // Mirror the real store: it archives the current head row if there is one and
            // then inserts. For elections that authenticate on nothing, getOrCreateElectionRoll
            // hands back a roll it never persisted, so there is no head row to update and the
            // insert is what creates it. The mock used to no-op in that case, which hid
            // everything the cast-vote path writes to the roll for open_open elections.
            const existing = await this._rollStore.getByVoterID(event.roll.election_id, event.roll.voter_id, ctx);
            if (existing) {
                await this._rollStore.update(event.roll, ctx, `User submits a ballot`);
            } else {
                await this._rollStore.submitElectionRoll([event.roll], ctx, `User submits a ballot`);
            }
        }
    }

}