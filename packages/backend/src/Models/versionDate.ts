/**
 * update_date doubles as the version id for optimistic concurrency on
 * versioned rows (rolls, ballots): a write demotes the head only if its
 * update_date still equals the one the writer read. That is only sound if
 * every new version gets an update_date different from the one it replaces.
 * Date.now() alone repeats within a millisecond, which would let a stale
 * writer match the new head and overwrite it, so a replacement version is
 * always at least one ms past its predecessor.
 */
export const nextVersionDate = (previous_update_date: string): string =>
    Math.max(Date.now(), Number(previous_update_date) + 1).toString();
