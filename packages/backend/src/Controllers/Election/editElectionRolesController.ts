import { electionValidation } from '@equal-vote/star-vote-shared/domain_model/Election';
import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { responseErr } from '../../Util';
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

var ElectionsModel = ServiceLocator.electionsDb();


const editElectionRoles = async (req: IElectionRequest, res: Response, next: NextFunction) => {

    const inputElection = req.body.Election;
    Logger.info(req, `editElectionRoles: ${req.election.election_id}`)
    expectPermission(req.user_auth.roles, permissions.canEditElectionRoles)
    // TODO: should this only be allowed in draft??
    // if (inputElection.state !== 'draft') {
    //     Logger.info(req, `Election is not editable, state=${inputElection.state}`);
    //     throw new BadRequest("Election is not editable")
    // }
    
    var failMsg = "Failed to update Election roles";
    const expected_update_date = req.election.update_date as string;
    req.election.admin_ids = req.body.admin_ids
    req.election.audit_ids = req.body.audit_ids
    req.election.credential_ids = req.body.credential_ids
    const updatedElection = await ElectionsModel.updateElection(req.election, req, `Update election roles`, expected_update_date);
    if (!updatedElection) {
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    req.election = updatedElection
    Logger.debug(req, `editElectionRoles succeeds for ${updatedElection.election_id}`);

    res.status(200).json({election: req.election})
}

export {
    editElectionRoles
}
