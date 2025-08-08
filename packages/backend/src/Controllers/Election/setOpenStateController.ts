import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

var ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const setOpenState = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.archive ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)

    const election: Election = req.election
    const closing = req.body.closing

    var msg = null
    if (typeof closing !== 'boolean') {
        msg = "closing setting not provided or incorrect type"
    } else if (election.state !== 'closed' && election.state !== 'open') {
        msg = "Cannot close/open an election that is not open or closed"
    } else if (closing && election.state === 'closed') {
        msg = "Cannot close an election that is already closed"
    } else if (!closing && election.state === 'open') {
        msg = "Cannot open an election that is already open"
    }

    if (msg) {
        Logger.info(req, msg)
        throw new BadRequest(msg)
    }

    var failMsg
    if (closing) {
        election.state = 'closed'
        failMsg = "Failed to close election"
    } else {
        election.state = 'open'
        failMsg = "Failed to open election"
    }
    
    const updatedElection = await ElectionsModel.updateElection(req.election, req, `Open or close election`);
    if (!updatedElection) {
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    res.json({ election: updatedElection })
}

export {
    setOpenState,
}