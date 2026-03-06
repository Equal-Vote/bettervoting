import { Response } from 'express';
import { IRequest } from '../IRequest';
import Logger from '../Services/Logging/Logger';
import { logSafeHash } from '../Services/Logging/logSafeHash';

interface SendGridEvent {
    email?: string;
    event?: string;
    sg_message_id?: string;
    timestamp?: number;
    [key: string]: unknown;
}

export const sendGridWebhookController = (req: IRequest, res: Response) => {
    const rawBody = req.body as Buffer;
    const signature = String(req.headers['x-twilio-email-event-webhook-signature'] ?? 'missing');
    const timestamp = String(req.headers['x-twilio-email-event-webhook-timestamp'] ?? 'missing');
    Logger.info(req, `SendGridWebhook signature=${signature} timestamp=${timestamp}`);

    try {
        const events: SendGridEvent[] = JSON.parse(rawBody.toString('utf8'));
        const summary = events.map(e => `event=${e.event} email=${logSafeHash(e.email)}`).join('; ');
        Logger.info(req, `SendGridWebhook events: ${summary}`);
    } catch {
        Logger.warn(req, `SendGridWebhook: could not parse body`);
    }

    // TODO: verify signature using SENDGRID_WEBHOOK_VERIFICATION_KEY env var
    // verification checks: ECDSA signature over (timestamp + raw body) matches public key
    res.status(200).send('OK');
};
