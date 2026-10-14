import { EmailSend } from '@equal-vote/star-vote-shared/domain_model/EmailSend';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';
import EmailStatusDB from './EmailStatus';

// In-memory stand-in for emailSendsDB. create() writes the queued status rows into the
// mock EmailStatusDB, as the real one does inside its transaction.
export default class EmailSendsDB {

    _sends: EmailSend[] = [];

    constructor(private statusDb: EmailStatusDB) {}

    async create(send: EmailSend, voter_ids: string[], ctx: ILoggingContext): Promise<Map<string, number>> {
        Logger.debug(ctx, `MockEmailSends create send_id=${send.send_id} recipients=${voter_ids.length}`);
        this._sends.push({ ...send });
        const statusIds = new Map<string, number>();
        for (const voter_id of voter_ids) {
            statusIds.set(voter_id, this.statusDb._insert({
                send_id: send.send_id,
                election_id: send.election_id,
                voter_id,
                message_id: null,
                status: 'queued',
                created_at: send.created_at,
                updated_at: send.created_at,
            }));
        }
        return statusIds;
    }

    async getByElection(election_id: string, _ctx: ILoggingContext): Promise<EmailSend[]> {
        return this._sends
            .filter(s => s.election_id === election_id)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map(s => ({ ...s }));
    }
}
