import { ElectionRollState } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";

const ElectionRollModel = ServiceLocator.electionRollDb();
import { permission, permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { InternalServerError, Unauthorized } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { updateRollWithRetry } from "./rollHistoryUtils";

const className = "VoterRollState.Controllers";

const approveElectionRoll = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    Logger.info(req, `${className}.approveElectionRoll ${req.params.id}`);
    await changeElectionRollState(req, ElectionRollState.approved, [ElectionRollState.registered, ElectionRollState.flagged], permissions.canApproveElectionRoll)
    res.status(200).json({})
}

const flagElectionRoll = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    Logger.info(req, `${className}.flagElectionRoll ${req.params.id}`);
    await changeElectionRollState(req, ElectionRollState.flagged, [ElectionRollState.approved, ElectionRollState.registered, ElectionRollState.invalid], permissions.canFlagElectionRoll)
    res.status(200).json({})
}

const invalidateElectionRoll = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    Logger.info(req, `${className}.flagElectionRoll ${req.params.id}`);
    await changeElectionRollState(req, ElectionRollState.invalid, [ElectionRollState.flagged], permissions.canInvalidateBallot)
    res.status(200).json({})
}

const uninvalidateElectionRoll = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    Logger.info(req, `${className}.flagElectionRoll ${req.params.id}`);
    await changeElectionRollState(req, ElectionRollState.flagged, [ElectionRollState.invalid], permissions.canInvalidateBallot)
    res.status(200).json({})
}

const changeElectionRollState = async (req: IElectionRequest, newState: ElectionRollState, validStates: ElectionRollState[], permission: permission) => {
    expectPermission(req.user_auth.roles, permission)
    const roll = await ElectionRollModel.getByVoterID(req.election.election_id, req.body.electionRollEntry.voter_id, req)
    if (!roll) {
        const msg = "Could not find election roll";
        Logger.info(req, msg);
        throw new InternalServerError(msg);
        }
    // The transition check runs inside the mutation so it is re-evaluated against
    // the current head row if the first write loses a concurrency race.
    await updateRollWithRetry(
        req.election.election_id,
        roll.voter_id,
        (current) => {
            if (!validStates.includes(current.state)) {
                throw new Unauthorized('Invalid election roll state transition')
            }
            current.state = newState;
            if (current.history == null) {
                current.history = [];
            }
            current.history.push({
                action_type: newState,
                actor: req.user?.email ?? '',
                timestamp: Date.now(),
            })
        },
        req,
        "Changing Election Roll state to " + newState,
        roll,
    );
}

export  {
    changeElectionRollState,
    approveElectionRoll,
    flagElectionRoll,
    invalidateElectionRoll,
    uninvalidateElectionRoll
}
