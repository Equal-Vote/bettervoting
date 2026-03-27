import { Response } from 'express';
import crypto from 'crypto';
import { IRequest } from '../IRequest';
import Logger from '../Services/Logging/Logger';
import ServiceLocator from '../ServiceLocator';

interface SendGridEvent {
    email?: string;
    event?: string;
    sg_message_id?: string;
    timestamp?: number;
    [key: string]: unknown;
}

const EmailEventsDB = ServiceLocator.emailEventsDb();

function extractBaseMessageId(sg_message_id: string): string {
    const filterIdx = sg_message_id.indexOf('.filter');
    return filterIdx >= 0 ? sg_message_id.substring(0, filterIdx) : sg_message_id;
}

export const sendGridWebhookController = async (req: IRequest, res: Response) => {
    try {
        const signature = String(req.headers['x-twilio-email-event-webhook-signature'] ?? 'missing');
        const timestamp = String(req.headers['x-twilio-email-event-webhook-timestamp'] ?? 'missing');
        Logger.info(req, `SendGridWebhook signature=${signature} timestamp=${timestamp}`);

        const rawBody = req.body as Buffer;

        let events: SendGridEvent[];
        try {
            events = JSON.parse(rawBody.toString('utf8'));
        } catch {
            Logger.warn(req, `SendGridWebhook: could not parse body`);
            res.status(400).send('Bad request');
            return;
        }

        Logger.info(req, `SendGridWebhook: ${events.length} event(s)`);

        // This is a PUBLIC KEY from sendgrid.  I can't see any reason we should ever have to change it.
        // It is safe to have public in the repo.
        const verificationKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5qOZpcaMe4gniCO5t9fSMq0MtkKvVL0qoqUX6Al/sKQK4OLhACy2WJzwYEm6MJm6djEk8GpTkjoTP9hu5ogSOQ==';

        const publicKey = crypto.createPublicKey({
            key: Buffer.from(verificationKey, 'base64'),
            format: 'der',
            type: 'spki',
        });
        const payload = timestamp + rawBody.toString('utf8');
        const valid = crypto.verify('SHA256', Buffer.from(payload), publicKey, Buffer.from(signature, 'base64'));

        if (!valid) {
            Logger.warn(req, `SendGridWebhook: invalid signature`);
            res.status(403).send('Invalid signature');
            return;
        }

        const timestampAge = Math.abs(Date.now() / 1000 - Number(timestamp));
        if (isNaN(timestampAge) || timestampAge > 300) {
            Logger.warn(req, `SendGridWebhook: timestamp too old or invalid (age=${timestampAge}s)`);
            res.status(403).send('Invalid timestamp');
            return;
        }

        for (const event of events) {
            if (!event.sg_message_id || !event.event) continue;

            const message_id = extractBaseMessageId(event.sg_message_id);
            try {
                const sentRow = await EmailEventsDB.getByMessageId(message_id, req);
                if (!sentRow) {
                    Logger.warn(req, `SendGridWebhook: no sent row for message_id=${message_id} (raw sg_message_id=${event.sg_message_id})`);
                    continue;
                }

                const { email, unique_args, sg_message_id, event: event_type, timestamp: event_ts, ...rest } = event;
                await EmailEventsDB.insert({
                    message_id,
                    election_id: sentRow.election_id,
                    voter_id: sentRow.voter_id,
                    event_type: event_type!,
                    event_timestamp: new Date((event_ts ?? Date.now() / 1000) * 1000).toISOString(),
                    details: Object.keys(rest).length > 0 ? rest : undefined,
                }, req);
            } catch (err: any) {
                Logger.error(req, `SendGridWebhook: failed to store event for message_id=${message_id}: ${err.message}`);
            }
        }

        res.status(200).send('OK');
    } catch (err: any) {
        Logger.error(req, `SendGridWebhook: unexpected error: ${err.message}`);
        res.status(500).send('Internal server error');
    }
};
