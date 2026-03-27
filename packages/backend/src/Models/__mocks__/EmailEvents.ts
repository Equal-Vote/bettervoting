import { EmailEvent } from '@equal-vote/star-vote-shared/domain_model/EmailEvent';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';

export default class EmailEventsDB {

    _events: EmailEvent[] = [];
    _nextId = 1;

    async insert(event: Omit<EmailEvent, 'id'>, ctx: ILoggingContext): Promise<void> {
        Logger.debug(ctx, `MockEmailEvents insert message_id=${event.message_id} event_type=${event.event_type}`);
        this._events.push({ ...event, id: this._nextId++ });
    }

    async getByElectionAndVoter(election_id: string, voter_id: string, ctx: ILoggingContext): Promise<EmailEvent[]> {
        return this._events.filter(e => e.election_id === election_id && e.voter_id === voter_id);
    }

    async getByElectionId(election_id: string, ctx: ILoggingContext): Promise<EmailEvent[]> {
        return this._events.filter(e => e.election_id === election_id);
    }

    async getByMessageId(message_id: string, ctx: ILoggingContext): Promise<EmailEvent | null> {
        return this._events.find(e => e.message_id === message_id && e.event_type === 'sent') ?? null;
    }
}
