import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission, hashString } from "../controllerUtils";
import { BadRequest, Unauthorized } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

var ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const claimElection = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.claimElection ${req.election.election_id}`);
    // temp_id will be verified against the election owner id to grant the owner role (even if we're logged in)
    expectPermission(req.user_auth.roles, permissions.canClaimElection)

    // check for no-op
    if(req.election.owner_id == req.user.sub){
        res.json({ success: true })
        return;
    }

    // must be logged in
    if(req.user.typ != 'ID'){
        throw new Unauthorized("User does not have permissions: must be logged in");
    }

    // verify claim key
    if(hashString(req.body.claim_key) != req.election.claim_key_hash){
        throw new Unauthorized("User does not have permissions: claim_key mismatch");
    }

    var failMsg = "Failed to update Election";
    req.election.owner_id = req.user.sub;
    const updatedElection = await ElectionsModel.updateElection(req.election, req, `Transferring Ownership`);
    if (!updatedElection) {
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    res.json({ success: true })
}

export {claimElection}