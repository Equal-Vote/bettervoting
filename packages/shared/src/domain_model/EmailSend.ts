import { Uid } from "./Uid";

// One admin action that sends email: a blast, an email to a single voter, or a round of
// invitations. Each recipient's email is tracked separately in EmailStatus.
export type EmailSendKind = 'blast' | 'single' | 'invite';

// Who the send went to. Blasts use the audience the admin picked; 'single' is one
// voter; 'uninvited' is every voter who hadn't been invited yet.
export type EmailSendAudience = 'all' | 'has_voted' | 'has_not_voted' | 'single' | 'uninvited';

export interface EmailSend {
    send_id: Uid;
    election_id: Uid;
    kind: EmailSendKind;
    audience: EmailSendAudience;
    // What the admin wrote. Invitations use a fixed template, so these are null for them.
    subject: string | null;
    body: string | null;
    sent_by: string; // the sending admin's email address
    created_at: string;
    recipient_count: number;
}

// Where one email stands:
//   queued  - waiting in our send queue
//   sending - handed to SendGrid, not yet delivered (includes SendGrid retrying a deferral)
//   done    - the recipient's mail server accepted it
//   failed  - it bounced, was dropped, or we couldn't hand it to SendGrid
export type EmailStatus = 'queued' | 'sending' | 'done' | 'failed';

export const EMAIL_STATUSES: EmailStatus[] = ['queued', 'sending', 'done', 'failed'];

// Statuses only move forward through this order, so a webhook event that arrives late,
// twice, or out of order can never move an email backwards. That one rule covers:
//   - a bounce makes any email failed, even one already delivered (receivers can accept
//     a message and reject it later);
//   - a delivery makes any email done unless it already failed;
//   - processed / deferred / our own "sent" make an email sending unless it's done or failed.
const STATUS_ORDER: Record<EmailStatus, number> = { queued: 0, sending: 1, done: 2, failed: 3 };

export function laterEmailStatus(current: EmailStatus, incoming: EmailStatus): EmailStatus {
    return STATUS_ORDER[incoming] > STATUS_ORDER[current] ? incoming : current;
}

// The statuses an email may move from to reach `target` (everything earlier in the order).
export function statusesBefore(target: EmailStatus): EmailStatus[] {
    return EMAIL_STATUSES.filter(s => STATUS_ORDER[s] < STATUS_ORDER[target]);
}

// The status a SendGrid event type moves an email to, or null for events that don't
// affect delivery (opens, clicks, spam reports, unsubscribes).
// "blocked" arrives as a bounce event with type "blocked", so it's covered by 'bounce'.
export function emailStatusForEvent(eventType: string): EmailStatus | null {
    switch (eventType) {
        case 'bounce':
        case 'dropped':
            return 'failed';
        case 'delivered':
            return 'done';
        case 'sent':
        case 'processed':
        case 'deferred':
            return 'sending';
        default:
            return null;
    }
}

export interface EmailStatusRecord {
    id?: number;
    send_id: Uid;
    election_id: Uid;
    voter_id: Uid;
    message_id: string | null; // SendGrid's X-Message-Id, set once SendGrid accepts the email
    status: EmailStatus;
    created_at: string;
    updated_at: string;
}

// GET /Election/:id/emailSends: each send with how many of its emails are in each status.
export interface EmailSendSummary extends EmailSend {
    counts: Record<EmailStatus, number>;
}

// One email to one voter, as shown in the admin's voter view.
export interface VoterEmail {
    send_id: Uid;
    kind: EmailSendKind;
    subject: string | null;
    sent_by: string;
    created_at: string; // when the send was started
    status: EmailStatus;
    updated_at: string; // when the status last changed
}
