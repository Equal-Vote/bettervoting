import { EmailStatus, EmailStatusRecord, laterEmailStatus, VoterEmail } from '@equal-vote/star-vote-shared/domain_model/EmailSend';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';
import EmailSendsDB from './EmailSends';

// In-memory stand-in for emailStatusDB, applying the same forward-only status rule.
export default class EmailStatusDB {

    _rows: EmailStatusRecord[] = [];
    _nextId = 1;
    sendsDb?: EmailSendsDB; // set by the mock ServiceLocator, for the voter view's join

    _insert(row: Omit<EmailStatusRecord, 'id'>): number {
        const id = this._nextId++;
        this._rows.push({ ...row, id });
        return id;
    }

    private advance(row: EmailStatusRecord, status: EmailStatus): boolean {
        const next = laterEmailStatus(row.status, status);
        if (next === row.status) return false;
        row.status = next;
        row.updated_at = new Date().toISOString();
        return true;
    }

    async markSent(id: number, message_id: string, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `MockEmailStatus markSent id=${id}`);
        const row = this._rows.find(r => r.id === id);
        if (!row) return;
        row.message_id = message_id;
        if (row.status === 'queued') this.advance(row, 'sending');
    }

    async advanceByMessageId(message_id: string, status: EmailStatus, _ctx: ILoggingContext): Promise<boolean> {
        const row = this._rows.find(r => r.message_id === message_id);
        return row ? this.advance(row, status) : false;
    }

    async markFailed(ids: number[], _ctx: ILoggingContext): Promise<void> {
        this._rows.filter(r => ids.includes(r.id!)).forEach(r => this.advance(r, 'failed'));
    }

    async getByMessageId(message_id: string, _ctx: ILoggingContext): Promise<EmailStatusRecord | null> {
        const row = this._rows.find(r => r.message_id === message_id);
        return row ? { ...row } : null;
    }

    async getByElectionAndVoter(election_id: string, voter_id: string, _ctx: ILoggingContext): Promise<VoterEmail[]> {
        const sends = this.sendsDb?._sends ?? [];
        return this._rows
            .filter(r => r.election_id === election_id && r.voter_id === voter_id)
            .flatMap(r => {
                const s = sends.find(x => x.send_id === r.send_id);
                return s ? [{ send_id: r.send_id, kind: s.kind, subject: s.subject, sent_by: s.sent_by, created_at: s.created_at, status: r.status, updated_at: r.updated_at }] : [];
            })
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    async countsByElection(election_id: string, _ctx: ILoggingContext): Promise<{ send_id: string, status: EmailStatus, count: number }[]> {
        const counts = new Map<string, { send_id: string, status: EmailStatus, count: number }>();
        this._rows.filter(r => r.election_id === election_id).forEach(r => {
            const key = `${r.send_id}|${r.status}`;
            const c = counts.get(key) ?? { send_id: r.send_id, status: r.status, count: 0 };
            c.count++;
            counts.set(key, c);
        });
        return [...counts.values()];
    }
}
