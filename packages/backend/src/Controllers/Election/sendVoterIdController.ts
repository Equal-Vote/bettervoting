import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { BadRequest, NotFound } from "@curveball/http-errors";
import { VoterIdReminder } from "../../Services/Email/EmailTemplates";
import { getVoterAuthenticationMode } from '@equal-vote/star-vote-shared/domain_model/VoterAuthenticationMode';
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { randomUUID } from "crypto";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { logSafeHash } from '../../Services/Logging/logSafeHash';

const ElectionRollModel = ServiceLocator.electionRollDb();
const ElectionsModel = ServiceLocator.electionsDb();
const EmailService = ServiceLocator.emailService();
const EmailEventsDB = ServiceLocator.emailEventsDb();
const EventQueue = ServiceLocator.eventQueue();

const className = "election.Controllers";

export const SendVoterIdEventQueue = "sendVoterIdEvent";

// At most one voter-id email per (election, address) in each window. The window is
// enforced by the queue (pg-boss singleton slot), before any roll lookup, so it
// applies identically to addresses that are and are not on the roll.
export const VOTER_ID_REQUEST_WINDOW_SECONDS = 5 * 60;

export type SendVoterIdEvent = {
    requestId: Uid,
    election_id: string,
    email: string,
}

// Loose on purpose: this only rejects strings that cannot be an address at all, so
// the 400 carries no information about the roll.
const looksLikeEmail = (s: unknown): s is string =>
    typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// POST /Election/:id/requestVoterId  { email }
//
// Public, unauthenticated. The response is the same whether or not the address is on
// the roll, and the request path does no roll lookup at all: it enqueues a job and
// returns. The lookup, and the send if there is a match, happen in the queue handler.
// Elections that don't use bv-managed ids get a 404 -- the flow does not exist there.
const requestVoterIdController = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    const election = req.election;
    Logger.info(req, `${className}.requestVoterId ${election.election_id}`);

    let mode: string | null = null;
    try { mode = getVoterAuthenticationMode(election.settings); } catch { mode = null; }
    if (mode !== 'closed_bv_managed_ids') {
        throw new NotFound('Not found');
    }

    const raw = req.body?.email;
    if (!looksLikeEmail(raw)) {
        throw new BadRequest('A valid email address is required');
    }
    const email = raw.trim().toLowerCase();

    const job: SendVoterIdEvent = {
        requestId: req.contextId ? req.contextId : randomUUID(),
        election_id: election.election_id,
        email,
    };
    const jobId = await (await EventQueue).publish(SendVoterIdEventQueue, job, {
        throttleKey: `${election.election_id}:${email}`,
        throttleSeconds: VOTER_ID_REQUEST_WINDOW_SECONDS,
    });
    Logger.info(req, `${className}.requestVoterId ${election.election_id} email:${logSafeHash(email)} ${jobId ? 'queued' : 'throttled'}`);

    res.json({});
}

async function handleSendVoterIdEvent(job: { id: string; data: SendVoterIdEvent; }): Promise<void> {
    const { requestId, election_id, email } = job.data;
    const ctx = Logger.createContext(requestId);

    // Everything that can throw happens before the send, so a pg-boss retry can never
    // re-send an email that already went out.
    const election = await ElectionsModel.getElectionByID(election_id, ctx);
    if (!election) {
        Logger.warn(ctx, `${className}.handleSendVoterIdEvent election ${election_id} not found`);
        return;
    }
    let mode: string | null = null;
    try { mode = getVoterAuthenticationMode(election.settings); } catch { mode = null; }
    if (mode !== 'closed_bv_managed_ids') {
        // settings changed between request and send
        return;
    }

    const roll = await ElectionRollModel.getByElectionIdAndEmail(election_id, email, ctx);
    if (!roll) {
        Logger.info(ctx, `${className}.handleSendVoterIdEvent ${election_id} email:${logSafeHash(email)} not on roll, nothing sent`);
        return;
    }

    const msg = VoterIdReminder(election, roll.email ?? email, [roll.voter_id]);
    const emailResponse = await EmailService.sendEmails([msg]);
    Logger.info(ctx, `${className}.handleSendVoterIdEvent ${election_id} voter:${logSafeHash(roll.voter_id)} sent`);

    // Record for delivery tracking (bounces etc. arrive by message id). Failure here is
    // logged, not thrown: the email is already out and a retry would send it again.
    const xMessageId = emailResponse?.[0]?.[0]?.headers?.['x-message-id'];
    if (xMessageId) {
        try {
            await EmailEventsDB.insert({
                message_id: xMessageId,
                election_id: election.election_id,
                voter_id: roll.voter_id,
                event_type: 'sent',
                event_timestamp: new Date().toISOString(),
                details: { status_code: emailResponse?.[0]?.[0]?.statusCode, kind: 'voter_id_request' },
            }, ctx);
        } catch (err: any) {
            Logger.error(ctx, `Could not insert email event: ${err.message}`);
        }
    }
}

export {
    requestVoterIdController,
    handleSendVoterIdEvent,
}
