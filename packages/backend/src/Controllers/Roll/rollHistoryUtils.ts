import { Conflict } from '@curveball/http-errors';
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import { logSafeHash } from '../../Services/Logging/logSafeHash';

const ElectionRollModel = ServiceLocator.electionRollDb();

const DEFAULT_ATTEMPTS = 3;

/**
 * Read-modify-write one roll entry under optimistic concurrency.
 *
 * Every roll version carries the full history array, and the public audit log
 * reads the head row only, so a write built from a stale read would silently
 * drop whatever another writer appended in between. The store refuses such a
 * write with a Conflict; this helper then re-reads the head row and re-applies
 * `mutate` to it, so the losing writer's change is layered on top of the
 * winner's instead of replacing it.
 *
 * `mutate` must therefore be safe to run more than once, on a fresh row each
 * time. It may throw to abort (e.g. the row is no longer in a state the action
 * allows); that error propagates unchanged.
 *
 * `initial` is the row the caller already holds; it is used for the first
 * attempt so the common no-conflict case costs no extra read.
 *
 * Resolves to the row the store actually wrote. Nothing is returned until that
 * write has succeeded, so callers can treat the result as proof the change is
 * durable before acting on it.
 */
export async function updateRollWithRetry(
    election_id: string,
    voter_id: string,
    mutate: (roll: ElectionRoll) => void,
    ctx: ILoggingContext,
    reason: string,
    initial?: ElectionRoll,
    attempts: number = DEFAULT_ATTEMPTS,
): Promise<ElectionRoll> {
    let roll: ElectionRoll | null | undefined = initial;
    for (let attempt = 1; ; attempt++) {
        if (!roll) {
            roll = await ElectionRollModel.getByVoterID(election_id, voter_id, ctx);
            if (!roll) {
                throw new Conflict(`Roll entry for voter ${logSafeHash(voter_id)} disappeared while updating it`);
            }
        }
        mutate(roll);
        try {
            return await ElectionRollModel.update(roll, ctx, reason, String(roll.update_date));
        } catch (err: unknown) {
            if (!(err instanceof Conflict) || attempt >= attempts) {
                throw err;
            }
            Logger.info(ctx, `Lost roll write race for voter ${logSafeHash(voter_id)} (${reason}), re-reading (attempt ${attempt}/${attempts})`);
            roll = null;
        }
    }
}
