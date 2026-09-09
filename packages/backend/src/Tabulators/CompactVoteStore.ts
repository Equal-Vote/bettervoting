import { OrderedVote, OrderedVoteMark } from "@equal-vote/star-vote-shared/domain_model/Vote";
import { encodeOrderedVote } from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";

// Holds one race's marks for a whole election in flat typed arrays.
//
// It stores the same thing an OrderedVote does — a race's marks positionally
// against a RaceCandidateOrder, plus overvote_rank and has_duplicate_rank — but
// unrolled into a handful of big buffers instead of one small JS array per
// ballot. That's the difference between ~100 and ~176 bytes per ballot, and
// between a handful of allocations and 62,000 per race for the GC to trace.
//
// Marks can't be packed into the values array alone: a mark is a number, an
// explicit null, or absent (the ballot has no entry for that candidate at all),
// and tabulation distinguishes all three. So each value gets a one-byte tag and
// the value slot only means anything when the tag says NUMBER.
//
// The marks live in fixed-size blocks rather than one growable buffer, for two
// reasons: appending never has to copy (a doubling buffer transiently holds the
// old and new copies at once), and consumeMarks can drop each block as soon as
// it has been read, so expanding the store into the tabulator's input doesn't
// need room for both at full size.

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

/** ballots per marks block; ~400KB per block at 10 candidates */
export const BLOCK_BALLOTS = 4096;

const INITIAL_CAPACITY = 256;

/**
 * Ballots the first block of a race is sized for. Blocks are addressed as
 * `count / BLOCK_BALLOTS` either way; this only controls how much of that
 * range is actually allocated up front, so a race with a handful of ballots
 * doesn't reserve a full block. It doubles up to BLOCK_BALLOTS on demand.
 * Every race in the election has a live store while the ballots stream, so
 * without this a 20-race election paid a full block per race no matter how
 * few ballots were cast.
 */
const INITIAL_BLOCK_BALLOTS = 64;

/**
 * Called once per ballot by consumeMarks. Reads mark `i` as
 * `tags[offset + i]`, and its value (when the tag is MARK_NUMBER) as
 * `values[offset + i]`. The raw buffers are handed over rather than a wrapper
 * object so walking the store allocates nothing per ballot.
 */
export type MarkVisitor = (ballot: number, tags: Uint8Array, values: Float64Array, offset: number) => void;

export class CompactVoteStore {
    readonly candidateCount: number;
    count = 0;

    // scratch row for the ballot being projected; reused so projecting a ballot
    // allocates nothing
    readonly rowValues: Float64Array;
    readonly rowTags: Uint8Array;

    // one entry per BLOCK_BALLOTS ballots; nulled out as they're consumed
    private markValueBlocks: (Float64Array | null)[] = [];
    private markTagBlocks: (Uint8Array | null)[] = [];
    // ballots each block is currently sized for; only ever below BLOCK_BALLOTS
    // for a block that is still the last one (see ensureBlockCapacity)
    private blockCapacity: number[] = [];

    // per-ballot, so ~9 bytes each — small enough to keep as plain growable buffers
    private capacity = 0;
    private overvoteValues = new Float64Array(0);
    private overvoteTags = new Uint8Array(0);
    private duplicateTags = new Uint8Array(0);
    private released = false;
    private marksConsumed = false;

    constructor(candidateCount: number) {
        this.candidateCount = candidateCount;
        this.rowValues = new Float64Array(candidateCount);
        this.rowTags = new Uint8Array(candidateCount);
    }

    /**
     * Reset the scratch row before projecting the next ballot. Only the tags are
     * cleared — a stale value can't be read back, because a slot's value is only
     * ever consulted when this ballot's own setMark tagged it MARK_NUMBER.
     */
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

    /**
     * Make sure block `blockIndex` can hold `ballots` ballots, growing it by
     * doubling (capped at BLOCK_BALLOTS) and copying what's already there.
     * Only the newest block is ever short of BLOCK_BALLOTS, and it stops
     * growing once it reaches a full block, so the copying is bounded by one
     * block's worth of work per store.
     */
    private ensureBlockCapacity(blockIndex: number, ballots: number) {
        const have = this.blockCapacity[blockIndex] ?? 0;
        if (have >= ballots) return;

        let capacity = have === 0 ? INITIAL_BLOCK_BALLOTS : have * 2;
        while (capacity < ballots) capacity *= 2;
        if (capacity > BLOCK_BALLOTS) capacity = BLOCK_BALLOTS;

        const values = new Float64Array(capacity * this.candidateCount);
        const tags = new Uint8Array(capacity * this.candidateCount);
        const priorValues = this.markValueBlocks[blockIndex];
        if (priorValues) {
            values.set(priorValues);
            tags.set(this.markTagBlocks[blockIndex]!);
        }
        this.markValueBlocks[blockIndex] = values;
        this.markTagBlocks[blockIndex] = tags;
        this.blockCapacity[blockIndex] = capacity;
    }

    /** Commit the scratch row as one more ballot. */
    commitRow(overvote_rank: number | null | undefined, has_duplicate_rank: boolean | null | undefined) {
        if (this.released) throw new Error('CompactVoteStore: write after release');
        // appending after the blocks were handed out would push a fresh block at
        // the wrong index and silently drop or misplace the ballot
        if (this.marksConsumed) throw new Error('CompactVoteStore: write after marks were consumed');
        this.growPerBallot(this.count + 1);

        const blockIndex = (this.count / BLOCK_BALLOTS) | 0;
        const ballotInBlock = this.count % BLOCK_BALLOTS;
        this.ensureBlockCapacity(blockIndex, ballotInBlock + 1);
        const offset = ballotInBlock * this.candidateCount;
        this.markValueBlocks[blockIndex]!.set(this.rowValues, offset);
        this.markTagBlocks[blockIndex]!.set(this.rowTags, offset);

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

    /**
     * Walk every ballot's marks in order, freeing each block as soon as it has
     * been read. The store is empty afterwards: this is a move, not a read, so
     * that expanding it into the tabulator's input never needs room for the
     * whole store and the whole expansion at once.
     */
    consumeMarks(visit: MarkVisitor) {
        if (this.released) throw new Error('CompactVoteStore: read after release');
        if (this.marksConsumed) throw new Error('CompactVoteStore: marks already consumed');
        this.marksConsumed = true;
        const {candidateCount, count} = this;
        for (let blockIndex = 0; blockIndex < this.markValueBlocks.length; blockIndex++) {
            const values = this.markValueBlocks[blockIndex]!;
            const tags = this.markTagBlocks[blockIndex]!;
            const first = blockIndex * BLOCK_BALLOTS;
            const last = Math.min(first + BLOCK_BALLOTS, count);
            for (let ballot = first; ballot < last; ballot++) {
                visit(ballot, tags, values, (ballot - first) * candidateCount);
            }
            // drop the block now that it's been read, so peak memory is the
            // expansion plus one block rather than the expansion plus the store
            this.markValueBlocks[blockIndex] = null;
            this.markTagBlocks[blockIndex] = null;
        }
        this.markValueBlocks = [];
        this.markTagBlocks = [];
        this.blockCapacity = [];
    }

    markTag(ballot: number, index: number) {
        const block = this.markTagBlocks[(ballot / BLOCK_BALLOTS) | 0];
        if (!block) throw new Error('CompactVoteStore: marks already consumed');
        return block[(ballot % BLOCK_BALLOTS) * this.candidateCount + index];
    }

    markValue(ballot: number, index: number) {
        const block = this.markValueBlocks[(ballot / BLOCK_BALLOTS) | 0];
        if (!block) throw new Error('CompactVoteStore: marks already consumed');
        return block[(ballot % BLOCK_BALLOTS) * this.candidateCount + index];
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
        this.markValueBlocks = [];
        this.markTagBlocks = [];
        this.blockCapacity = [];
        this.overvoteValues = new Float64Array(0);
        this.overvoteTags = new Uint8Array(0);
        this.duplicateTags = new Uint8Array(0);
    }

    private growPerBallot(needed: number) {
        if (needed <= this.capacity) return;
        const capacity = Math.max(INITIAL_CAPACITY, this.capacity * 2, needed);
        const overvoteValues = new Float64Array(capacity);
        const overvoteTags = new Uint8Array(capacity);
        const duplicateTags = new Uint8Array(capacity);
        overvoteValues.set(this.overvoteValues);
        overvoteTags.set(this.overvoteTags);
        duplicateTags.set(this.duplicateTags);
        this.overvoteValues = overvoteValues;
        this.overvoteTags = overvoteTags;
        this.duplicateTags = duplicateTags;
        this.capacity = capacity;
    }
}
