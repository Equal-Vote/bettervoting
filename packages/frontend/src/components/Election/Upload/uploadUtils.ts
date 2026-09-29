import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { NewBallot, OrderedNewBallot, RaceCandidateOrder } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { encodeOrderedVote } from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";

export function computeRaceOrder(election: Election): RaceCandidateOrder[] {
    return election.races.map(race => ({
        race_id: race.race_id,
        candidate_id_order: race.candidates.map(c => c.candidate_id)
    }));
}

export function encodeBallotRow(row: NewBallot, raceOrder: RaceCandidateOrder[]): OrderedNewBallot {
    const { votes, ...rest } = row;
    return {
        ...rest,
        orderedVotes: raceOrder.map(({ race_id, candidate_id_order }) => {
            const vote = (votes ?? []).find(v => v.race_id === race_id);
            if (!vote) {
                // Race missing from this row's votes — encode as all-undecided
                return encodeOrderedVote(candidate_id_order.map(() => null), undefined, false);
            }
            return encodeOrderedVote(
                vote.scores.map(s => s.score),
                vote.overvote_rank,
                vote.has_duplicate_rank ?? false
            );
        })
    };
}

export interface UploadBatchResult {
    responses: unknown[];
    aborted: boolean;
}

const INITIAL_BATCH_SIZE = 700;
const BATCH_SHRINK_FACTOR = 0.75;
const MIN_BATCH_SIZE = 10;

export async function uploadBallotsBatched(
    electionId: string,
    raceOrder: RaceCandidateOrder[],
    ballots: OrderedNewBallot[],
    onProgress?: (uploaded: number, total: number) => void
): Promise<UploadBatchResult> {
    let batchSize = INITIAL_BATCH_SIZE;
    let nextIndex = 0;
    const responses: unknown[] = [];

    while (nextIndex < ballots.length) {
        onProgress?.(nextIndex, ballots.length);

        let uploadRes: Response;
        do {
            uploadRes = await fetch(`/API/Election/${electionId}/uploadBallots`, {
                method: 'post',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    race_order: raceOrder,
                    ballots: ballots.slice(nextIndex, nextIndex + batchSize).map((b, i) => ({
                        voter_id: i,
                        ballot: b
                    }))
                })
            });

            if (!uploadRes.ok) {
                batchSize = Math.round(batchSize * BATCH_SHRINK_FACTOR);
                if (batchSize < MIN_BATCH_SIZE) {
                    return { responses, aborted: true };
                }
            }
        } while (!uploadRes.ok);

        nextIndex += batchSize;
        const res = await uploadRes.json();
        responses.push(...res.responses);
    }

    return { responses, aborted: false };
}
