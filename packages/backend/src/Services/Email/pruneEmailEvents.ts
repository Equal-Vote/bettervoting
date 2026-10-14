import ServiceLocator from '../../ServiceLocator';
import Logger from '../Logging/Logger';

// emailEventsDB holds every raw SendGrid event, for diagnosing deliveries while they
// happen. Each email's lasting status is in emailStatusDB, so the raw events only need
// to live long enough to investigate a problem: SendGrid retries a deferred email for
// up to 72 hours, and a month leaves room to look back after that.
export const EMAIL_EVENT_RETENTION_DAYS = 30;

export const PruneEmailEventsQueue = 'pruneEmailEvents';
// Daily at 04:17 UTC, a quiet hour for US elections.
export const PRUNE_EMAIL_EVENTS_CRON = '17 4 * * *';

export async function handlePruneEmailEvents(): Promise<void> {
    const ctx = Logger.createContext(PruneEmailEventsQueue);
    const cutoff = new Date(Date.now() - EMAIL_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deleted = await ServiceLocator.emailEventsDb().deleteOlderThan(cutoff, ctx);
    Logger.info(ctx, `${PruneEmailEventsQueue}: deleted ${deleted} email events older than ${cutoff.toISOString()}`);
}
