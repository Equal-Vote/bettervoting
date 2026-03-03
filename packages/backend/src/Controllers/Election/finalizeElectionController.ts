import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { innerDeleteAllBallotsForElectionID } from '../Ballot';

var ElectionsModel = ServiceLocator.electionsDb();
var ElectionRollModel = ServiceLocator.electionRollDb();

const className = "election.Controllers";

const finalizeElection = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.finalize ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)

    if (req.election.state !== 'draft') {
        var msg = "Election already finalized";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    innerDeleteAllBallotsForElectionID(req);

    const electionId = req.election.election_id;
    let electionRoll: ElectionRoll[] | null = null
    if (req.election.settings.voter_access === 'closed' && req.election.settings.invitation === 'email') {
        electionRoll = await ElectionRollModel.getRollsByElectionID(electionId, req);
        if (!electionRoll) {
            const msg = `Election roll for ${electionId} not found`;
            Logger.info(req, msg);
            throw new BadRequest(msg)
        }
    }

    var failMsg = "Failed to update Election";
    req.election.state = 'finalized'
    const updatedElection = await ElectionsModel.updateElection(req.election, req, `Finalizing election`);
    if (!updatedElection) {
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    res.json({ election: updatedElection })
}

export {
    finalizeElection
}
