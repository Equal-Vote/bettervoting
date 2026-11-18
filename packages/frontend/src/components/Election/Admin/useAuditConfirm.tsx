import { ReactNode } from 'react';
import { AUDIT_NOTE_MAX_LENGTH, electionHasAuditLog } from '@equal-vote/star-vote-shared/domain_model/AuditLog';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';

type AuditConfirmOptions = {
    title: string
    // The action's own confirmation text, if it has one. The audit-log notice is
    // appended as a second paragraph.
    message?: ReactNode
    cancel?: string
    submit?: string
}

// null when the admin backed out; otherwise the body fields to send with the
// request (an empty object when no explanation was given, so callers can
// spread it into the request body unconditionally).
export type AuditConfirmResult = { audit_note?: string } | null

/**
 * Confirmation step for an admin action that will appear in the election's audit
 * log: says who can see the log (everyone, or only the election's admins when the
 * election was created before the cutoff), links to it, and offers an optional
 * explanation that is stored with the entry.
 */
export default function useAuditConfirm() {
    const { election, t } = useElection();
    const confirm = useConfirm();

    return async ({ title, message, cancel, submit }: AuditConfirmOptions): Promise<AuditConfirmResult> => {
        const notice = t(electionHasAuditLog(election) ? 'audit_confirm.notice' : 'audit_confirm.notice_admin_only', {
            history_url: `/${election.election_id}/history`,
            newWindow: true,
        });
        const result = await confirm({
            title,
            message: message ? <>{message}{'\n\n'}{notice}</> : notice,
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
