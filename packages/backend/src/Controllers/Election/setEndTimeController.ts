import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

var ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const setEndTime = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.setEndTime ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)
    const election: Election = req.election
    const end_time = req.body.end_time

    if (end_time !== null && end_time !== undefined && typeof end_time !== 'string') {
        throw new BadRequest('end_time must be a date string or null')
    }

    election.end_time = end_time ? new Date(end_time) : undefined;

    const updatedElection = await ElectionsModel.updateElection(election, req, `Set End Time`);
    if (!updatedElection) {
        const failMsg = 'could not update end_time'
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    res.json({ election: updatedElection })
}

export {
    setEndTime,
}
