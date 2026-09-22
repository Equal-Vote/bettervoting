import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";

// NOTE: the batching constants and the { responses, aborted } result shape follow the convention of
//       uploadBallotsBatched (see Upload ballots refactor PR #1611) so the two can be merged later
const INITIAL_BATCH_SIZE = 700;
const BATCH_SHRINK_FACTOR = 0.75;
const MIN_BATCH_SIZE = 10;

export interface RollInput {
    voter_id?: string;
    email?: string;
    precinct?: string;
    state?: string;
}

// The backend matches rolls the same way, see addElectionRollController
export const normalizeEmail = (email?: string) => (email ?? '').trim().toLowerCase();
export const normalizeVoterId = (voterId?: string) => (voterId ?? '').trim();

export interface RollConflicts {
    // rolls that are safe to upload (first occurrence wins)
    rolls: RollInput[];
    // rolls skipped because they match a voter that's already on the roll
    existingCount: number;
    // rolls skipped because they match an earlier entry in the same upload
    fileCount: number;
}

export function findRollConflicts(existingRolls: Pick<ElectionRoll, 'voter_id' | 'email'>[], newRolls: RollInput[]): RollConflicts {
    const emails = new Set<string>();
    const voterIds = new Set<string>();
    existingRolls.forEach(r => {
        if (normalizeEmail(r.email)) emails.add(normalizeEmail(r.email));
        if (normalizeVoterId(r.voter_id)) voterIds.add(normalizeVoterId(r.voter_id));
    });

    const fileEmails = new Set<string>();
    const fileVoterIds = new Set<string>();
    const rolls: RollInput[] = [];
    let existingCount = 0;
    let fileCount = 0;

    for (const roll of newRolls) {
        const email = normalizeEmail(roll.email);
        const voterId = normalizeVoterId(roll.voter_id);

        if ((email && emails.has(email)) || (voterId && voterIds.has(voterId))) {
            existingCount++;
        } else if ((email && fileEmails.has(email)) || (voterId && fileVoterIds.has(voterId))) {
            fileCount++;
        } else {
            if (email) fileEmails.add(email);
            if (voterId) fileVoterIds.add(voterId);
            rolls.push(roll);
        }
    }
    return { rolls, existingCount, fileCount };
}

export interface UploadRollsResult {
    responses: unknown[];
    uploaded: number;
    aborted: boolean;
    errorMessage?: string;
}

// Only failures that a smaller batch could plausibly fix are retried (413 = body too large)
// Anything else (voter limit, permissions, duplicates, etc.) aborts right away, since retrying can't help
const isRetryableStatus = (status: number) => (status === 413);

export async function uploadRollsBatched(
    electionId: string,
    rolls: RollInput[],
    onProgress?: (uploaded: number, total: number) => void
): Promise<UploadRollsResult> {
    let batchSize = INITIAL_BATCH_SIZE;
    let nextIndex = 0;
    const responses: unknown[] = [];

    while (nextIndex < rolls.length) {
        onProgress?.(nextIndex, rolls.length);
        const batch = rolls.slice(nextIndex, nextIndex + batchSize);

        let errorMessage: string | undefined = undefined;
        let retryable = false;
        try {
            const res = await fetch(`/API/Election/${electionId}/rolls/`, {
                method: 'post',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ electionRoll: batch }),
            });
            if (res.ok) {
                responses.push(await res.json());
                nextIndex += batch.length;
                continue;
            }
            const body = await res.json().catch(() => null);
            errorMessage = body?.error ?? `Error making request: ${res.status}`;
            retryable = isRetryableStatus(res.status);
        } catch (err) {
            errorMessage = err instanceof Error ? err.message : 'Network error';
            retryable = true;
        }

        batchSize = Math.round(batchSize * BATCH_SHRINK_FACTOR);
        if (!retryable || batchSize < MIN_BATCH_SIZE) {
            return { responses, uploaded: nextIndex, aborted: true, errorMessage };
        }
    }

    onProgress?.(rolls.length, rolls.length);
    return { responses, uploaded: rolls.length, aborted: false };
}
