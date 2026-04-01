import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const setOpenState = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.archive ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)

    const election: Election = req.election
    const open = req.body.open

    let msg;
    if (typeof open !== 'boolean') {
        msg = "open setting not provided or incorrect type";
    } else if (election.state !== 'closed' && election.state !== 'open') {
        msg = "Cannot close/open an election that is not open or closed";
    } else if (open && election.state === 'open') {
        msg = "Cannot open an election that is already open";
    } else if (!open && election.state === 'closed') {
        msg = "Cannot close an election that is already closed";
    } else if (election.start_time || election.end_time) {
        msg = "Cannot open or close an election with scheduled start and end times";
    }
    election.state = open ? "open" : "closed";

    // re-opening an election should maintain mutual exclusion of ballot_updates and preliminary results
    if (election.settings.ballot_updates && election.state === "open" && election.settings.public_results) {
        election.settings.public_results = false;
    }

    if (msg) {
        Logger.info(req, msg);
        throw new BadRequest(msg);
    }

    const updatedElection = await ElectionsModel.updateElection(req.election, req, "Open or close election");
    if (!updatedElection) {
        const failMsg = `Failed to set election state to ${election.state}`;
        Logger.info(req, failMsg);
        throw new InternalServerError(failMsg);
    }

    res.status(200).json({ election: updatedElection });
}

export {
    setOpenState,
}
