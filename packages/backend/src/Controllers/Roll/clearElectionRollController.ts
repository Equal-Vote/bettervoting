import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionRollModel = ServiceLocator.electionRollDb();

const className = "VoterRolls.Controllers";

// Draft-only escape hatch for admins who picked the wrong voter auth mode: once a roll exists
// the auth/access radios lock, and there was no in-app way to undo that short of recreating the
// election. Clearing archives the rows (head=false) rather than deleting them, so the audit
// trail survives and the radios re-enable because the roll now reads as empty.
const clearElectionRoll = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    expectPermission(req.user_auth.roles, permissions.canAddToElectionRoll)
    Logger.info(req, `${className}.clearElectionRoll ${req.election.election_id}`);

    if (req.election.state !== 'draft') {
        Logger.info(req, `Refusing to clear roll, election state=${req.election.state}`);
        throw new BadRequest("The voter list can only be cleared while the election is in draft")
    }

    const cleared = await ElectionRollModel.archiveRollsByElectionID(
        req.election.election_id,
        req,
        `${req.user.email} cleared the voter list of draft election ${req.election.election_id}`
    );

    Logger.info(req, `${className}.clearElectionRoll archived ${cleared} voters from ${req.election.election_id}`);

    res.status(200).json({ election: req.election, cleared });
    return next()
}

export {
    clearElectionRoll,
}
