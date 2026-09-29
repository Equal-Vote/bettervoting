import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest } from "@curveball/http-errors";
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const BallotModel = ServiceLocator.ballotsDb();

const innerDeleteAllBallotsForElectionID = async (req: IElectionRequest) => {
    var electionId = req.election.election_id;

    Logger.debug(req, "deleteAllBallotsForElectionID : " + electionId);

    let apiAvailable = req.election.state === 'draft' || req.election.public_archive_id !== null;

    if (!apiAvailable) {
        Logger.info(req, `Election status, state=${req.election.state}, public_archive_id=${req.election.public_archive_id}`);
        throw new BadRequest("Ballots can only be reset while in draft mode or if it's a public_archive election")
    }

    expectPermission(req.user_auth.roles, permissions.canDeleteAllBallots)

    const success = await BallotModel.deleteAllBallotsForElectionID (String(electionId), req);
    if (!success) {
        const msg = `Failed to reset ballots for election ${electionId}`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    return success
}

const deleteAllBallotsForElectionID = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    res.json({ success: innerDeleteAllBallotsForElectionID(req) })
}

export {
    deleteAllBallotsForElectionID,
    innerDeleteAllBallotsForElectionID
}
