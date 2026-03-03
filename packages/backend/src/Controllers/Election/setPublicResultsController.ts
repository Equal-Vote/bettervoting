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

const setPublicResults = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.setPublicResults ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)
    const election: Election = req.election
    const public_results = req.body.public_results
    if (typeof public_results !== 'boolean') {
        throw new BadRequest('public_results setting not provided or incorrect type')
    }
    election.settings.public_results = public_results

    const updatedElection = await ElectionsModel.updateElection(election, req, `Publish Results`);
    if (!updatedElection) {
        const failMsg = 'could not update public_results setting'
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    res.json({ election: updatedElection })
}

export  {
    setPublicResults,
}
