import { ElectionRoll, ElectionRollState } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { responseErr } from "../../Util";
import { hasPermission, permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionRollModel = ServiceLocator.electionRollDb();

const className = "VoterRolls.Controllers";

const editElectionRoll = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    expectPermission(req.user_auth.roles, permissions.canEditElectionRoll)
    const electinoRollInput = req.body.electionRollEntry;
    Logger.info(req, `${className}.editElectionRoll election:${req.election.election_id}`);
    if (electinoRollInput.history == null) {
        electinoRollInput.history = [];
    }
    electinoRollInput.history.push([{
        action_type: 'edited',
        actor: req.user.email,
        timestamp: Date.now(),
    }])
    const electionRollEntry = await ElectionRollModel.update(electinoRollInput, req, `User Editing Election Roll`);
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
