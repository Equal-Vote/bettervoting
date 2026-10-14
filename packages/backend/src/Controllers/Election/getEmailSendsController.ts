import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from '../controllerUtils';
import { IElectionRequest } from '../../IRequest';
import { Response, NextFunction } from 'express';
import { EMAIL_STATUSES, EmailSendSummary, EmailStatus } from '@equal-vote/star-vote-shared/domain_model/EmailSend';

const EmailSendsDB = ServiceLocator.emailSendsDb();
const EmailStatusDB = ServiceLocator.emailStatusDb();

const className = 'election.Controllers';

// Every email send for the election, newest first, with how many of its emails are
// queued, sending, done and failed. Same audience as the voter list.
const getEmailSendsController = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    Logger.info(req, `${className}.getEmailSends ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canViewElectionRoll);

    const electionId = req.election.election_id;
    const [sends, counts] = await Promise.all([
        EmailSendsDB.getByElection(electionId, req),
        EmailStatusDB.countsByElection(electionId, req),
    ]);

    const emptyCounts = () => Object.fromEntries(EMAIL_STATUSES.map(s => [s, 0])) as Record<EmailStatus, number>;
    const countsBySend = new Map<string, Record<EmailStatus, number>>();
    counts.forEach(({ send_id, status, count }) => {
        const c = countsBySend.get(send_id) ?? emptyCounts();
        c[status] = count;
        countsBySend.set(send_id, c);
    });

    const summaries: EmailSendSummary[] = sends.map(send => ({
        ...send,
        created_at: new Date(send.created_at).toISOString(),
        counts: countsBySend.get(send.send_id) ?? emptyCounts(),
    }));
    res.json({ sends: summaries });
};

export { getEmailSendsController };
