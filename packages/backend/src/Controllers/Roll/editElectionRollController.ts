import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { expectPermission } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionRollModel = ServiceLocator.electionRollDb();

const className = "VoterRolls.Controllers";

// The only roll fields this endpoint may change. Everything else (election_id, voter_id,
// submitted, ballot_id, state, ip_hash, history, email_data) is server-managed and is
// carried over from the stored row; state changes go through approve/flag/invalidate.
const EDITABLE_FIELDS = ['email', 'precinct'] as const;

const editElectionRoll = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    expectPermission(req.user_auth.roles, permissions.canEditElectionRoll)
    const electionId = req.election.election_id;
    const input = req.body?.electionRollEntry;
    Logger.info(req, `${className}.editElectionRoll election:${electionId}`);

    if (!input || typeof input.voter_id !== 'string' || input.voter_id.length === 0) {
        throw new BadRequest("electionRollEntry.voter_id is required");
    }
    if (input.election_id !== undefined && input.election_id !== electionId) {
        throw new BadRequest("Election ID must match the URL Param");
    }
    for (const field of EDITABLE_FIELDS) {
        const value = input[field];
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new BadRequest(`electionRollEntry.${field} must be a string`);
        }
    }

    // Edit an existing entry of this election only; never create one here.
    const existing = await ElectionRollModel.getByVoterID(electionId, input.voter_id, req);
    if (!existing) {
        const msg = "Election Roll not found";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    const edited: ElectionRoll = { ...existing };
    for (const field of EDITABLE_FIELDS) {
        if (field in input) {
            edited[field] = input[field] ?? undefined;
        }
    }
    edited.history = [
        ...(existing.history ?? []),
        { action_type: 'edited', actor: req.user?.email ?? req.user?.sub ?? 'unknown', timestamp: Date.now() },
    ];

    const electionRollEntry = await ElectionRollModel.update(edited, req, `User Editing Election Roll`);
    if (!electionRollEntry) {
        const msg = "Election Roll not found";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }
    res.status(200).json(electionRollEntry)
}

export {
    editElectionRoll,
}
