import { Response } from 'express';
import crypto from 'crypto';
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

    let events: SendGridEvent[];
    try {
        events = JSON.parse(rawBody.toString('utf8'));
    } catch {
        Logger.warn(req, `SendGridWebhook: could not parse body`);
        res.status(400).send('Bad request');
        return;
    }

    const redactedEvents = events.map(({ email, unique_args, ...rest }) => ({ ...rest, email: logSafeHash(email) }));
    Logger.info(req, `SendGridWebhook events: ${JSON.stringify(redactedEvents)}`);

    // This is a PUBLIC KEY from sendgrid.  I can't see any reason we should ever have to change it.
    // It is safe to have public in the repo.
    const verificationKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5qOZpcaMe4gniCO5t9fSMq0MtkKvVL0qoqUX6Al/sKQK4OLhACy2WJzwYEm6MJm6djEk8GpTkjoTP9hu5ogSOQ==';

    const publicKey = crypto.createPublicKey({
        key: Buffer.from(verificationKey, 'base64'),
        format: 'der',
        type: 'spki',
    });
    const payload = timestamp + rawBody.toString('utf8');
    const valid = crypto.verify(null, Buffer.from(payload), publicKey, Buffer.from(signature, 'base64'));

    if (!valid) {
        Logger.warn(req, `SendGridWebhook: invalid signature`);
        res.status(403).send('Invalid signature');
        return;
    }

    res.status(200).send('OK');
};
