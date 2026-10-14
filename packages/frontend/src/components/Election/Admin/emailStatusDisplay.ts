import { EmailSendAudience, EmailSendKind, EmailStatus } from "@equal-vote/star-vote-shared/domain_model/EmailSend";

// How each email status is shown to admins. "done" means the recipient's mail server
// accepted the email, which admins know as "delivered".
export const EMAIL_STATUS_DISPLAY: Record<EmailStatus, { label: string, chip: 'default' | 'info' | 'success' | 'error', bar: string }> = {
    queued: { label: 'Queued', chip: 'default', bar: 'grey.400' },
    sending: { label: 'Sending', chip: 'info', bar: 'info.main' },
    done: { label: 'Delivered', chip: 'success', bar: 'success.main' },
    failed: { label: 'Failed', chip: 'error', bar: 'error.main' },
};

// The same, from one voter's point of view.
export const describeVoterEmail = (kind: EmailSendKind): string =>
    kind === 'invite' ? 'Invitation' : kind === 'single' ? 'Email to this voter' : 'Email blast';

export const describeSend = (kind: EmailSendKind, audience: EmailSendAudience): string => {
    if (kind === 'invite') return audience === 'single' ? 'Invitation to one voter' : 'Invitations';
    if (kind === 'single') return 'Email to one voter';
    switch (audience) {
        case 'has_voted': return 'Email to voters who have voted';
        case 'has_not_voted': return "Email to voters who haven't voted";
        default: return 'Email to all voters';
    }
};
