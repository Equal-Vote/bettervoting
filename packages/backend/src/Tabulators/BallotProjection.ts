import { Race } from "@equal-vote/star-vote-shared/domain_model/Race";
import { Candidate } from "@equal-vote/star-vote-shared/domain_model/Candidate";
import { WriteInCandidate } from "@equal-vote/star-vote-shared/domain_model/WriteIn";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { Vote } from "@equal-vote/star-vote-shared/domain_model/Vote";
import { RaceCandidateOrder } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { candidate, rawVote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { trimLower } from "@equal-vote/star-vote-shared/domain_model/Util";
import { makeWriteInCandidateId } from "@equal-vote/star-vote-shared/utils/makeID";
import { BallotVotes } from "../Models/IBallotStore";
import { CompactVoteStore, MARK_ABSENT, MARK_NULL } from "./CompactVoteStore";

// Tabulation needs the whole election at once, but "the whole election" doesn't
// have to mean a heap full of verbose ballot rows. Each streamed ballot is
// projected straight into a CompactVoteStore — the same positional layout an
// OrderedVote uses, backed by flat typed arrays — and the verbose row is dropped
// immediately. The tabulator's own input is expanded from the store one race at
// a time, so a race's worth of it is the largest thing alive.
//
// The projection re-encodes the semantic content of every ballot, so a bug here
// silently miscounts an election rather than failing loudly. Everything below
// mirrors what getElectionResultsController used to do inline; see
// BallotProjection.test.ts, which pins the two against each other.

export interface ProjectionHooks {
    debug?: (msg: string) => void;
    warn?: (msg: string) => void;
}

export class RaceProjection {
    readonly race: Race;
    /** write-ins only participate when the race enables them AND has a write-in list */
    readonly useWriteIns: boolean;
    readonly writeInCandidates: WriteInCandidate[];
    /**
     * The candidate list this race is tabulated over: race candidates, then
     * approved write-ins. Callers mutate this — shuffleCandidatesForRandomTiebreak
     * sorts it in place, and the tabulators write to its entries — so it must
     * never be used to interpret the store. See candidateIds.
     */
    readonly candidates: candidate[];
    /**
     * The order the store's marks are positional against, snapshotted at
     * construction. Reading it from `candidates` instead would silently
     * misattribute every ballot's marks once that array has been shuffled.
     */
    readonly candidateIds: Uid[];
    readonly store: CompactVoteStore;

    numUnprocessedWriteIns = 0;
    numExcludedWriteIns = 0;

    // race.candidates only — an approved write-in id reached via score.candidate_id
    // (rather than via write_in_name) is not a "regular candidate"
    private readonly regularIndexById: Map<Uid, number>;
    private readonly writeInIndexByName: Map<string, number>;
    private readonly writeInByAlias: Map<string, WriteInCandidate>;
    private readonly hooks: ProjectionHooks;

    constructor(race: Race, hooks: ProjectionHooks = {}) {
        this.race = race;
        this.hooks = hooks;
        this.useWriteIns = !!(race.enable_write_in && race.write_in_candidates && race.write_in_candidates.length > 0);
        this.writeInCandidates = this.useWriteIns && race.write_in_candidates ? race.write_in_candidates : [];

        this.candidates = race.candidates.map((c: Candidate) => ({
            id: c.candidate_id,
            name: c.candidate_name,
            tieBreakOrder: -1,
            votesPreferredOver: {},
            winsAgainst: {},
        }));

        this.regularIndexById = new Map();
        race.candidates.forEach((c: Candidate, i) => {
            // first occurrence wins, matching the `race.candidates.some(...)` lookup this replaced
            if (!this.regularIndexById.has(c.candidate_id)) this.regularIndexById.set(c.candidate_id, i);
        });

        this.writeInIndexByName = new Map();
        this.writeInCandidates.forEach(wc => {
            if (!wc.approved) return;
            this.writeInIndexByName.set(wc.candidate_name, this.candidates.length);
            this.candidates.push({
                id: makeWriteInCandidateId(wc.candidate_name),
                name: wc.candidate_name,
                tieBreakOrder: -1,
                votesPreferredOver: {},
                winsAgainst: {},
            });
        });

        this.writeInByAlias = new Map();
        this.writeInCandidates.forEach(wc => {
            // first match wins, matching the `writeInCandidates.find(...)` lookup this replaced
            wc.aliases.forEach(alias => {
                if (!this.writeInByAlias.has(alias)) this.writeInByAlias.set(alias, wc);
            });
        });

        this.candidateIds = this.candidates.map(c => c.id);
        this.store = new CompactVoteStore(this.candidates.length);
    }

    /** number of ballots that contained a vote for this race */
    get count() {
        return this.store.count;
    }

    /** the candidate order the store's marks are positional against */
    get candidateOrder(): RaceCandidateOrder {
        return {race_id: this.race.race_id, candidate_id_order: this.candidateIds};
    }

    addVote(vote: Vote) {
        const store = this.store;
        store.startRow();

        vote.scores.forEach(score => {
            // a score of undefined (a row missing the field) is recorded as null so
            // it stays distinguishable from "no entry for this candidate"; the
            // tabulators treat null and undefined marks identically
            const mark = score.score === undefined ? null : score.score;

            const index = this.regularIndexById.get(score.candidate_id);
            if (index !== undefined) {
                if (store.markTagOf(index) !== MARK_ABSENT) {
                    this.hooks.warn?.(`[Tabulation] Duplicate score for candidate "${score.candidate_id}" on same ballot, keeping first score`);
                    return;
                }
                store.setMark(index, mark);
                return;
            }
            if (!this.race.enable_write_in || !score.write_in_name) return;

            const writeInCandidate = this.writeInByAlias.get(trimLower(score.write_in_name));
            this.hooks.debug?.(`[WriteIn Debug] ballot write_in_name="${score.write_in_name}" matched=${!!writeInCandidate} approved=${writeInCandidate?.approved} matchedAliases=${JSON.stringify(writeInCandidate?.aliases)}`);
            if (!writeInCandidate) {
                this.numUnprocessedWriteIns += 1;
                this.numExcludedWriteIns += 1;
            } else if (writeInCandidate.approved) {
                const writeInIndex = this.writeInIndexByName.get(writeInCandidate.candidate_name)!;
                if (store.markTagOf(writeInIndex) === MARK_ABSENT) {
                    store.setMark(writeInIndex, mark);
                } else {
                    this.hooks.warn?.(`[WriteIn] Duplicate write-in score for "${writeInCandidate.candidate_name}" on same ballot, keeping first score`);
                }
            } else {
                this.numExcludedWriteIns += 1;
            }
        });

        store.commitRow(vote.overvote_rank, vote.has_duplicate_rank);
    }

    /**
     * Expand this race's compact store into the tabulator's input and release
     * the store. Called one race at a time so only a single race's verbose
     * tabulator input is ever alive; consumeMarks frees the store block by block
     * as it goes, so the two don't both sit at full size.
     */
    takeRawVotes(): rawVote[] {
        const store = this.store;
        if (store.isReleased) throw new Error('RaceProjection: takeRawVotes after the store was released');
        const candidateIds = this.candidateIds;
        const candidateCount = store.candidateCount;
        const cvr: rawVote[] = new Array(store.count);
        store.consumeMarks((ballot, tags, values, offset) => {
            const marks: {[key: string]: number | null} = {};
            for (let i = 0; i < candidateCount; i++) {
                const tag = tags[offset + i];
                // MARK_ABSENT means the ballot had no entry for this candidate, which
                // is not the same as an explicit blank — leave the key out entirely
                if (tag === MARK_ABSENT) continue;
                marks[candidateIds[i]] = tag === MARK_NULL ? null : unbox(values[offset + i]);
            }
            cvr[ballot] = {
                marks,
                overvote_rank: store.overvoteRank(ballot) as number | undefined,
                has_duplicate_rank: store.hasDuplicateRank(ballot) as boolean | undefined,
            };
        });
        store.release();
        return cvr;
    }

    /** Drop the compact store without expanding it (for races that skip tabulation). */
    release() {
        this.store.release();
    }
}

// Reading a Float64Array always yields a double, and V8 boxes a double stored
// into an object property as a HeapNumber — 310k of them for a 31k-ballot race
// with 10 candidates, which doubles the size of the expanded cvr. Marks are
// almost always small integers, so hand those back as int32s, which V8 keeps as
// tagged small ints with no boxing. The value is unchanged either way; anything
// that isn't an exact int32 (a fraction, NaN, a huge number) falls through.
const unbox = (value: number) => ((value | 0) === value ? value | 0 : value);

/**
 * Stream every ballot once, projecting it into each race's compact store.
 * Peak memory is the projections, not the ballot rows.
 */
export const projectBallots = async (
    races: Race[],
    ballots: AsyncIterable<BallotVotes>,
    hooks: ProjectionHooks = {},
): Promise<RaceProjection[]> => {
    const projections = races.map(race => new RaceProjection(race, hooks));
    for await (const ballot of ballots) {
        for (let i = 0; i < projections.length; i++) {
            const vote = ballot.votes.find(v => v.race_id === races[i].race_id);
            if (vote) projections[i].addVote(vote);
        }
    }
    return projections;
};
