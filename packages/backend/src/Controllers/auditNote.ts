import sanitizeHtml from 'sanitize-html';
import { BadRequest } from '@curveball/http-errors';
import { AUDIT_NOTE_MAX_LENGTH } from '@equal-vote/star-vote-shared/domain_model/AuditLog';
import { IRequest } from '../IRequest';

/**
 * Read the optional `audit_note` an admin may attach to an auditable action.
 *
 * Returns null when the caller sent nothing (or only whitespace), so every
 * existing client keeps working unchanged. Otherwise the note is stripped of
 * markup the same way election titles are before they reach a page (the log is
 * public, so it must never carry HTML), trimmed, and bounded in length.
 */
export const parseAuditNote = (req: IRequest): string | null => {
    const raw = req.body?.audit_note;
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string') {
        throw new BadRequest('audit_note must be a string');
    }
    // sanitize-html HTML-escapes the text it keeps (it is built to emit markup).
    // The note is stored and rendered as plain text, so undo that escaping; the
    // tags themselves are already gone.
    const note = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} })
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();
    if (note.length === 0) return null;
    if (note.length > AUDIT_NOTE_MAX_LENGTH) {
        throw new BadRequest(`audit_note must be at most ${AUDIT_NOTE_MAX_LENGTH} characters`);
    }
    return note;
};
