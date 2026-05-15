import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission, expectUpdateDate } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

var ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const archiveElection = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.archive ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)

    const election: Election = req.election

    if (election.state === 'archived') {
        var msg = "Election already archived";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    var failMsg = "Failed to update Election";
    election.state = 'archived'
    const expected_update_date = expectUpdateDate(req);
    const updatedElection = await ElectionsModel.updateElection(req.election, req, `Archive election`, expected_update_date);
    if (!updatedElection) {
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    res.json({ election: updatedElection })
}

export {
    archiveElection,
}