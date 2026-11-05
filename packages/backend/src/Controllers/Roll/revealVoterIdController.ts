import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { logSafeHash } from "../../Services/Logging/logSafeHash";
import { updateRollWithRetry } from "./rollHistoryUtils";

const ElectionRollModel = ServiceLocator.electionRollDb();

const className = "VoterRolls.Controllers";

/**
 * EMERGENCY "BREAK GLASS" ENDPOINT
 * This endpoint reveals the voter_id associated with an email address.
 * It creates a prominent audit log entry that includes:
 * - Who performed the action (actor user ID)
 * - Which voter's ID was revealed (email address)
 * - When the action was performed
 *
 * This should only be used in emergency situations where an admin needs
 * to send a unique voting URL to a voter.
 */
const revealVoterIdByEmail = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    const electionId = req.election.election_id;
    const email = req.body.email;

    if (!email || typeof email !== 'string') {
        throw new BadRequest('Email address is required');
    }

    // Reveal endpoint is only available when voter IDs are redacted
    const redactVoterIds = req.election.settings?.invitation === 'email';
    if (!redactVoterIds) {
        throw new BadRequest('Reveal voter ID is only available for email list elections');
    }

    expectPermission(req.user_auth.roles, permissions.canViewElectionRoll);

    const actor = req.user?.email || 'unknown';

    // PROMINENT LOGGING - This action should be highly visible in logs
    Logger.error(req, `BREAK GLASS ACTION - ${className}.revealVoterIdByEmail - Election: ${electionId}, Email: ${logSafeHash(email)}, Actor: ${logSafeHash(actor)}`);

    // Look the voter up directly rather than fetching the whole roll and scanning it
    // in memory -- this is a single-voter lookup, and on a large election the full
    // fetch was tens of MB to find one row.
    const rollEntry = await ElectionRollModel.getByElectionIdAndEmail(electionId, email, req);
    if (!rollEntry) {
        const msg = `No voter found with email ${logSafeHash(email)}`;
        Logger.info(req, msg);
        throw new BadRequest(msg);
    }

    // Record the reveal in the roll entry's history BEFORE disclosing anything.
    // The write is optimistic-concurrency checked and retried from a fresh read
    // if another writer (roll state change, invite send, the voter casting a
    // ballot) got there first; if it still cannot be made durable the request
    // fails and the voter ID is never returned. There must be no path on which
    // an admin learns a voter ID without the public audit log recording it.
    const revealAction = {
        action_type: '🚨 VOTER_ID_REVEALED',
        actor: actor,
        timestamp: Date.now(),
    };
    const logged = await updateRollWithRetry(
        electionId,
        rollEntry.voter_id,
        (roll) => {
            roll.history = roll.history || [];
            roll.history.push(revealAction);
        },
        req,
        '🚨 VOTER_ID_REVEALED',
        rollEntry,
    );

    Logger.error(req, `BREAK GLASS COMPLETED - ${className}.revealVoterIdByEmail - Election: ${electionId}, VoterID: ${logSafeHash(logged.voter_id)}, Email: ${logSafeHash(email)}`);

    res.json({
        voter_id: logged.voter_id,
        email: logged.email,
        warning: 'This action has been logged in the audit trail'
    });
}

export {
    revealVoterIdByEmail
}
