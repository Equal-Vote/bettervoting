import { Response } from 'express';
import { IRequest } from '../IRequest';
import Logger from '../Services/Logging/Logger';

export const sendGridWebhookController = (req: IRequest, res: Response) => {
    const rawBody = req.body as Buffer;
    const signature = String(req.headers['x-twilio-email-event-webhook-signature'] ?? 'missing');
    const timestamp = String(req.headers['x-twilio-email-event-webhook-timestamp'] ?? 'missing');
    Logger.info(req, `SendGridWebhook signature=${signature} timestamp=${timestamp}`);
    Logger.info(req, `SendGridWebhook body: ${rawBody.toString('utf8')}`);
    // TODO: verify signature using SENDGRID_WEBHOOK_VERIFICATION_KEY env var
    // verification checks: ECDSA signature over (timestamp + raw body) matches public key
    res.status(200).send('OK');
};
