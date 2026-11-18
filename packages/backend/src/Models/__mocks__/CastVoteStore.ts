import { ILoggingContext } from "../../Services/Logging/ILogger";
import { IBallotStore } from "../IBallotStore";
import { IElectionRollStore } from "../IElectionRollStore";
import { CastVoteEvent } from "../CastVoteStore";

export default class CastVoteStore {

    _ballotStore:IBallotStore;
    _rollStore:IElectionRollStore;

    constructor(ballotStore:IBallotStore, rollStore:IElectionRollStore) {
        this._ballotStore = ballotStore;
        this._rollStore = rollStore;
    }

    // Mirrors the real store's optimistic-concurrency rules (see CastVoteStore.ts),
    // minus the transaction: the ballot write is refused unless it replaces the
    // exact version it was built from, and the roll write is refused unless the
    // roll version read while building the event is still the head.
    async submitBallotEvent(event: CastVoteEvent, ctx: ILoggingContext): Promise<void> {
        let currentRoll = null;
        if (event.roll) {
            currentRoll = await this._rollStore.getByVoterID(event.roll.election_id, event.roll.voter_id, ctx);
            if (currentRoll && String(currentRoll.update_date) !== String(event.roll.update_date)) {
                // OCC missed: someone updated this roll since we read it.
                if (currentRoll.submitted) {
                    throw new Error("ALREADY_VOTED");
                }
                throw new Error("CONCURRENT_ROLL_EDIT_DETECTED");
            }
        }

        if (event.isBallotUpdate) {
            if (!event.expected_ballot_update_date) {
                throw new Error("CONCURRENT_BALLOT_UPDATE_DETECTED");
            }
            await this._ballotStore.updateBallot(event.inputBallot, ctx, `User updates a ballot`, event.expected_ballot_update_date);
        } else {
            await this._ballotStore.submitBallot(event.inputBallot, ctx, `User submits a ballot`);
        }

        if (event.roll) {
            event.roll.submitted = true;
            if (currentRoll) {
                await this._rollStore.update(event.roll, ctx, `User submits a ballot`, String(currentRoll.update_date));
            } else {
                // Open elections with no voter authentication hand us a roll that was
                // never persisted (see getOrCreateElectionRoll); the real store's
                // insert creates it here.
                await this._rollStore.submitElectionRoll([event.roll], ctx, `User submits a ballot`);
            }
        }
    }

}
