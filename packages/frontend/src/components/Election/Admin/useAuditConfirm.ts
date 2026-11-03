import { AUDIT_NOTE_MAX_LENGTH, electionHasAuditLog } from '@equal-vote/star-vote-shared/domain_model/AuditLog';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';

type AuditConfirmOptions = {
    title: string
    // The action's own confirmation text, if it has one. The public-audit-log
    // notice is appended as a second paragraph.
    message?: string
    cancel?: string
    submit?: string
}

// null when the admin backed out; otherwise the body fields to send with the
// request (an empty object when no explanation was given, so callers can
// spread it into the request body unconditionally).
export type AuditConfirmResult = { audit_note?: string } | null

/**
 * Confirmation step for an admin action that will appear in the election's
 * public audit log: tells the admin so, and offers an optional explanation that
 * is stored with the entry.
 *
 * Elections created before the audit-log cutoff have no public log, so for
 * them this degrades to the action's ordinary confirmation (when it has one)
 * or to no dialog at all.
 */
export default function useAuditConfirm() {
    const { election, t } = useElection();
    const confirm = useConfirm();

    return async ({ title, message, cancel, submit }: AuditConfirmOptions): Promise<AuditConfirmResult> => {
        if (!electionHasAuditLog(election)) {
            if (!message) return {};
            return await confirm({ title, message, cancel, submit }) ? {} : null;
        }

        const notice = t('audit_confirm.notice');
        const result = await confirm({
            title,
            message: message ? `${message}\n\n${notice}` : notice,
            cancel,
            submit,
            textField: {
                label: t('audit_confirm.note_label'),
                placeholder: t('audit_confirm.note_placeholder'),
                maxLength: AUDIT_NOTE_MAX_LENGTH,
            },
        });
        if (!result) return null;
        const note = result.text.trim();
        return note ? { audit_note: note } : {};
    };
}
