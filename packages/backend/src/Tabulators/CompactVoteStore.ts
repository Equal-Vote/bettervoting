import { OrderedVote, OrderedVoteMark } from "@equal-vote/star-vote-shared/domain_model/Vote";
import { encodeOrderedVote } from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";

// Holds one race's marks for a whole election in flat typed arrays.
//
// It stores the same thing an OrderedVote does — a race's marks positionally
// against a RaceCandidateOrder, plus overvote_rank and has_duplicate_rank — but
// unrolled into a handful of big buffers instead of one small JS array per
// ballot. That's the difference between ~9 bytes and ~150 bytes per ballot, and
// between a few allocations and one per ballot for the GC to trace.
//
// Marks can't be packed into the values array alone: a mark is a number, an
// explicit null, or absent (the ballot has no entry for that candidate at all),
// and tabulation distinguishes all three. So each value gets a one-byte tag and
// the value slot only means anything when the tag says NUMBER.

export const MARK_ABSENT = 0;
export const MARK_NULL = 1;
export const MARK_NUMBER = 2;

export const RANK_UNSET = 0;
export const RANK_NULL = 1;
export const RANK_NUMBER = 2;

export const DUPLICATE_UNSET = 0;
export const DUPLICATE_FALSE = 1;
export const DUPLICATE_TRUE = 2;
export const DUPLICATE_NULL = 3;

const INITIAL_CAPACITY = 256;

export class CompactVoteStore {
    readonly candidateCount: number;
    count = 0;

    // scratch row for the ballot being projected; reused so projecting a ballot
    // allocates nothing
    readonly rowValues: Float64Array;
    readonly rowTags: Uint8Array;

    private capacity = 0;
    private markValues = new Float64Array(0);
    private markTags = new Uint8Array(0);
    private overvoteValues = new Float64Array(0);
    private overvoteTags = new Uint8Array(0);
    private duplicateTags = new Uint8Array(0);
    private released = false;

    constructor(candidateCount: number) {
        this.candidateCount = candidateCount;
        this.rowValues = new Float64Array(candidateCount);
        this.rowTags = new Uint8Array(candidateCount);
    }

    /** Clear the scratch row before projecting the next ballot. */
    startRow() {
        this.rowTags.fill(MARK_ABSENT);
    }

    // NOTE: a non-numeric mark (only reachable from corrupt ballot rows, since
    // ballotValidation rejects them) is coerced to a number, NaN if unparseable,
    // rather than surviving as-is. The old keyed-object path passed such a value
    // straight into the tabulators' arithmetic, where a string mark turned sums
    // into concatenation — coercing is no worse and keeps the store flat.
    setMark(index: number, mark: number | null) {
        if (mark === null) {
            this.rowTags[index] = MARK_NULL;
        } else {
            this.rowTags[index] = MARK_NUMBER;
            this.rowValues[index] = mark;
        }
    }

    markTagOf(index: number) {
        return this.rowTags[index];
    }

    /** Commit the scratch row as one more ballot. */
    commitRow(overvote_rank: number | null | undefined, has_duplicate_rank: boolean | null | undefined) {
        if (this.released) throw new Error('CompactVoteStore: write after release');
        this.grow(this.count + 1);
        const base = this.count * this.candidateCount;
        this.markValues.set(this.rowValues, base);
        this.markTags.set(this.rowTags, base);

        if (overvote_rank === undefined) {
            this.overvoteTags[this.count] = RANK_UNSET;
        } else if (overvote_rank === null) {
            this.overvoteTags[this.count] = RANK_NULL;
        } else {
            this.overvoteTags[this.count] = RANK_NUMBER;
            this.overvoteValues[this.count] = overvote_rank;
        }

        this.duplicateTags[this.count] =
            has_duplicate_rank === undefined ? DUPLICATE_UNSET :
            has_duplicate_rank === null ? DUPLICATE_NULL :
            has_duplicate_rank ? DUPLICATE_TRUE : DUPLICATE_FALSE;

        this.count += 1;
    }

    markTag(ballot: number, index: number) {
        return this.markTags[ballot * this.candidateCount + index];
    }

    markValue(ballot: number, index: number) {
        return this.markValues[ballot * this.candidateCount + index];
    }

    overvoteRank(ballot: number): number | null | undefined {
        switch (this.overvoteTags[ballot]) {
            case RANK_UNSET: return undefined;
            case RANK_NULL: return null;
            default: return this.overvoteValues[ballot];
        }
    }

    hasDuplicateRank(ballot: number): boolean | null | undefined {
        switch (this.duplicateTags[ballot]) {
            case DUPLICATE_UNSET: return undefined;
            case DUPLICATE_NULL: return null;
            case DUPLICATE_TRUE: return true;
            default: return false;
        }
    }

    /**
     * The stored ballot in the shared OrderedVote layout (see OrderedVoteCodec) —
     * the array-of-arrays form of exactly what these buffers hold. Lossy only for
     * a null has_duplicate_rank, which the array layout can't express.
     */
    toOrderedVote(ballot: number): OrderedVote {
        const marks: OrderedVoteMark[] = new Array(this.candidateCount);
        for (let i = 0; i < this.candidateCount; i++) {
            const tag = this.markTag(ballot, i);
            marks[i] = tag === MARK_ABSENT ? undefined : tag === MARK_NULL ? null : this.markValue(ballot, i);
        }
        return encodeOrderedVote(
            marks,
            this.overvoteRank(ballot) as number | undefined,
            this.hasDuplicateRank(ballot) as boolean | undefined,
        );
    }

    get isReleased() {
        return this.released;
    }

    /** Drop the buffers. `count` survives, but the marks can no longer be read. */
    release() {
        this.released = true;
        this.capacity = 0;
        this.markValues = new Float64Array(0);
        this.markTags = new Uint8Array(0);
        this.overvoteValues = new Float64Array(0);
        this.overvoteTags = new Uint8Array(0);
        this.duplicateTags = new Uint8Array(0);
    }

    private grow(needed: number) {
        if (needed <= this.capacity) return;
        const capacity = Math.max(INITIAL_CAPACITY, this.capacity * 2, needed);
        const markValues = new Float64Array(capacity * this.candidateCount);
        const markTags = new Uint8Array(capacity * this.candidateCount);
        const overvoteValues = new Float64Array(capacity);
        const overvoteTags = new Uint8Array(capacity);
        const duplicateTags = new Uint8Array(capacity);
        markValues.set(this.markValues);
        markTags.set(this.markTags);
        overvoteValues.set(this.overvoteValues);
        overvoteTags.set(this.overvoteTags);
        duplicateTags.set(this.duplicateTags);
        this.markValues = markValues;
        this.markTags = markTags;
        this.overvoteValues = overvoteValues;
        this.overvoteTags = overvoteTags;
        this.duplicateTags = duplicateTags;
        this.capacity = capacity;
    }
}
