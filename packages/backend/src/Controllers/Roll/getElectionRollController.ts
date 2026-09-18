import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, Unauthorized } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ElectionRoll, ElectionRollAction, ElectionRollResponse } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { logSafeHash } from '../../Services/Logging/logSafeHash';

const ElectionRollModel = ServiceLocator.electionRollDb();
const EmailEventsModel = ServiceLocator.emailEventsDb();

const className = "VoterRolls.Controllers";

const redactString = (value: string, voterId: string | undefined, shouldRedact: boolean): string => {
    if (!shouldRedact || !voterId) return value;
    if (value.includes(voterId)) {
        return value.replaceAll(voterId, 'Voter');
    }
    return value;
}

// Note: ElectionRoll history entries can have nested structures and the email_data field is typed as 'any'.
// This function uses a defensive approach to handle multiple data types (arrays, objects, strings),
// strips out email_data entirely, and redacts voter IDs from action_type and actor fields.
const sanitizeHistory = (
    history: ElectionRoll['history'],
    voterId: string | undefined,
    redact: boolean
): ElectionRoll['history'] => {
    if (!history) return history;
    return history.map((entry: any) => {
        if (Array.isArray(entry)) {
            return sanitizeHistory(entry as ElectionRollAction[], voterId, redact);
        }
        if (entry && typeof entry === 'object') {
            const { email_data: _omitEmailData, ...rest } = entry;
            if (typeof rest.action_type === 'string') {
                rest.action_type = redactString(rest.action_type, voterId, redact);
            }
            if (typeof rest.actor === 'string') {
                rest.actor = redactString(rest.actor, voterId, redact);
            }
            return rest;
        }
        if (typeof entry === 'string') {
            return redactString(entry, voterId, redact);
        }
        return entry;
    });
}

// Note: email_data fields (inviteResponse, reminderResponse) are typed as 'any' in ElectionRoll.ts
// since email providers could return a variety of response formats.
// This function uses a defensive whitelist approach to only return known-safe fields and redact
// any voter IDs that might be embedded in error messages or response bodies.
// This is almost certainly not the right way to do this :).  But it could be fine for now.
const sanitizeEmailMetadata = (
    emailData: ElectionRoll['email_data'],
    voterId: string | undefined,
    redact: boolean
) => {
    if (!emailData) return emailData;
    const filterResponse = (response: any): any => {
        if (Array.isArray(response)) {
            const filtered = response
                .map(filterResponse)
                .filter((item) => item !== undefined);
            return filtered.length > 0 ? filtered : undefined;
        }
        if (response && typeof response === 'object') {
            const sanitized: Record<string, any> = {};
            if (typeof response.statusCode === 'number') sanitized.statusCode = response.statusCode;
            if (typeof response.status === 'string') sanitized.status = response.status;
            if (typeof response.error === 'string') sanitized.error = response.error;
            if (typeof response.Error === 'string') sanitized.Error = response.Error;
            if (typeof response.code === 'number') sanitized.code = response.code;
            if (typeof response.message === 'string') sanitized.message = redactString(response.message, voterId, redact);
            if (typeof response.body === 'string') sanitized.body = redactString(response.body, voterId, redact);
            return Object.keys(sanitized).length > 0 ? sanitized : undefined;
        }
        if (typeof response === 'string') {
            const redactedValue = redactString(response, voterId, redact);
            return redactedValue.length > 0 ? redactedValue : undefined;
        }
        return undefined;
    };
    const sanitized: Record<string, any> = {};
    if (emailData.inviteResponse !== undefined) {
        const sanitizedInvite = filterResponse(emailData.inviteResponse);
        if (sanitizedInvite !== undefined) {
            sanitized.inviteResponse = sanitizedInvite;
        }
    }
    if (emailData.reminderResponse !== undefined) {
        const sanitizedReminder = filterResponse(emailData.reminderResponse);
        if (sanitizedReminder !== undefined) {
            sanitized.reminderResponse = sanitizedReminder;
        }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

const getRollsByElectionID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    expectPermission(req.user_auth.roles, permissions.canViewElectionRoll)
    if(req.election.settings.voter_access === 'open'){
        throw new Unauthorized("Can't view voter roll for open elections")
    }
    const electionId = req.election.election_id;
    Logger.info(req, `${className}.getRollsByElectionID ${electionId}`);
    //requires election data in req, adds entire election roll

    const electionRoll = await ElectionRollModel.getRollsByElectionID(electionId, req);
    if (!electionRoll) {
        const msg = `Election roll for ${electionId} not found`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    // Scrub ballot_id to prevent linking voters to ballots
    const redactVoterIds = req.election.settings.invitation === 'email';
    const scrubbedRoll = electionRoll.map((roll) => {
        const sanitizedHistory = sanitizeHistory(roll.history, roll.voter_id, redactVoterIds);
        const sanitizedEmailData = redactVoterIds ? sanitizeEmailMetadata(roll.email_data, roll.voter_id, redactVoterIds) : roll.email_data;
        const base: Partial<ElectionRollResponse> = {
            ...roll,
            ballot_id: undefined,
            ip_hash: undefined,
            history: sanitizedHistory,
            email_data: sanitizedEmailData,
        };
        if (redactVoterIds) {
            delete base.voter_id;
        }
        return base;
    });

    Logger.debug(req, `Got Election: ${req.params.id}`);
    Logger.info(req, `${className}.returnRolls ${req.params.id}`);
    res.json({ election: req.election, electionRoll: scrubbedRoll });
}

// Everything the admin may see about one voter: the sanitized roll (history,
// invite marker) plus their email delivery events. Shared by the by-id GET and the
// by-id-or-email lookup so both return the same shape.
//
// The voter list deliberately does NOT carry email_events per roll -- on a large
// election that is ~9 event objects per voter built in memory at once, and it
// exhausted the heap. Per-voter detail lives here instead.
async function describeVoter(req: IElectionRequest, roll: ElectionRoll, opts: { includeEmailEvents: boolean }): Promise<ElectionRollResponse> {
    const redactVoterIds = req.election.settings.invitation === 'email';

    // Email events are admin detail. GET /rolls/:voter_id is voter-facing (VotePage
    // uses it) and has no permission check, so it must not start returning them --
    // only the canViewElectionRoll-gated lookup does.
    let emailEvents: ElectionRollResponse['email_events'] | undefined = undefined;
    if (opts.includeEmailEvents) try {
        const events = await EmailEventsModel.getByElectionIdAndVoterId(req.election.election_id, roll.voter_id, req);
        emailEvents = events.map(e => ({ event_type: e.event_type, event_timestamp: e.event_timestamp, details: e.details }));
    } catch (err: any) {
        Logger.warn(req, `Could not fetch email events: ${err.message}`);
    }

    // Scrub ballot_id to prevent linking voters to ballots
    const scrubbed: ElectionRollResponse = {
        ...roll,
        ballot_id: undefined,
        ip_hash: undefined,
        history: sanitizeHistory(roll.history, roll.voter_id, redactVoterIds),
        email_data: redactVoterIds ? sanitizeEmailMetadata(roll.email_data, roll.voter_id, redactVoterIds) : roll.email_data,
        ...(emailEvents !== undefined ? { email_events: emailEvents } : {}),
    };
    if (redactVoterIds) {
        // voter_id is ballot access on email-invitation elections; never return it here.
        delete (scrubbed as any).voter_id;
    }
    return scrubbed;
}

const getByVoterID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.getByVoterID ${req.election.election_id} ${logSafeHash(req.params.voter_id)}`)
    const roll = await ElectionRollModel.getByVoterID(req.election.election_id, req.params.voter_id, req)
    if (!roll) {
        const msg = "Voter Roll not found";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }
    res.json({ electionRollEntry: await describeVoter(req, roll, { includeEmailEvents: false }) })
}

// General "tell me about this voter" lookup, keyed on whichever identifier the
// caller has. Email-invitation elections redact voter_id from the list (it is
// ballot access), so the admin dialog only holds the email; other elections hold
// the voter_id. Email matching is case-insensitive, like the reveal path.
const lookupVoter = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.lookupVoter ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canViewElectionRoll)

    const voter_id = typeof req.body?.voter_id === 'string' ? req.body.voter_id.trim() : '';
    const email    = typeof req.body?.email    === 'string' ? req.body.email.trim()    : '';
    if (!voter_id && !email) {
        throw new BadRequest('voter_id or email is required');
    }

    const roll = voter_id
        ? await ElectionRollModel.getByVoterID(req.election.election_id, voter_id, req)
        : await ElectionRollModel.getByElectionIdAndEmail(req.election.election_id, email, req);
    if (!roll) {
        const msg = "Voter Roll not found";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }
    res.json({ electionRollEntry: await describeVoter(req, roll, { includeEmailEvents: true }) })
}

export {
    getRollsByElectionID,
    getByVoterID,
    lookupVoter
}
