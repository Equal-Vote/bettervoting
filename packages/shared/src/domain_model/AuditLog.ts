import type { Election } from "./Election";

// Elections created before this date never show a public audit log. Their
// admins set the election up when nothing told them that finalizing, opening,
// closing, publishing results, uploading ballots or revealing a voter ID would
// become part of a public record, so it isn't fair to expose one after the
// fact. The backend refuses the log for these elections and the frontend hides
// the link and the explanation prompt. Compared against electionDB.create_date.
export const AUDIT_LOG_CUTOFF_DATE = '2026-12-01T00:00:00.000Z';

// Upper bound on the optional explanation an admin can attach to an auditable
// action. Long enough for a paragraph, short enough that the log stays a log.
export const AUDIT_NOTE_MAX_LENGTH = 1000;

/**
 * Whether an election is recent enough to have a public audit log. A missing
 * or unparseable create_date counts as "before the cutoff": every legacy row
 * predates it, and hiding is the safe failure mode.
 */
export const electionHasAuditLog = (election: Partial<Pick<Election, 'create_date'>> | null | undefined): boolean => {
    if (!election?.create_date) return false;
    const createdMs = new Date(election.create_date).getTime();
    if (isNaN(createdMs)) return false;
    return createdMs >= new Date(AUDIT_LOG_CUTOFF_DATE).getTime();
};
