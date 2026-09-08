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

export interface UploadBatchedOptions {
    initialBatchSize?: number;
    shrinkFactor?: number;
    minBatchSize?: number;
}

export async function uploadBallotsBatched(
    electionId: string,
    raceOrder: RaceCandidateOrder[],
    ballots: OrderedNewBallot[],
    onProgress?: (uploaded: number, total: number) => void,
    options?: UploadBatchedOptions
): Promise<UploadBatchResult> {
    const initialBatchSize = options?.initialBatchSize ?? 700;
    const shrinkFactor = options?.shrinkFactor ?? 0.75;
    const minBatchSize = options?.minBatchSize ?? 10;

    let batchSize = initialBatchSize;
    let nextIndex = 0;
    let responses: unknown[] = [];

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
                batchSize = Math.round(batchSize * shrinkFactor);
                if (batchSize < minBatchSize) {
                    const remaining = ballots.length - nextIndex;
                    responses.push({
                        success: false,
                        voter_id: nextIndex,
                        message: `Upload aborted: batch size floor reached with ${remaining} ballots remaining`,
                    });
                    return { responses, aborted: true };
                }
            }
        } while (!uploadRes.ok);

        nextIndex += batchSize;
        const res = await uploadRes.json();
        responses = [...responses, ...res.responses];
    }

    return { responses, aborted: false };
}
