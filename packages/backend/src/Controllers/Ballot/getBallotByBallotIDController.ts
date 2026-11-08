import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { expectPermission } from "../controllerUtils";
import { permissions } from "@equal-vote/star-vote-shared/domain_model/permissions";

const BallotModel = ServiceLocator.ballotsDb();

const getBallotByBallotID = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    const electionId = req.election.election_id;
    const ballot_id = req.params.ballot_id
    if (!ballot_id) {
        throw new BadRequest('No Ballot ID provided')
    }
    // Only election staff may look up a ballot by id. If voters could, a ballot
    // id would be a receipt proving how they voted (vote buying / coercion).
    expectPermission(req.user_auth.roles, permissions.canViewBallots)
    Logger.debug(req, "getBallotByBallotID: " + ballot_id);

    const ballot = await BallotModel.getBallotByID(ballot_id, req);
    if (!ballot) {
        const msg = `Ballots not found for Election ${electionId}`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }
    if (electionId !== ballot.election_id){
        throw new BadRequest('Incorrect Election ID')
    }

    // Scrub identifying information from ballot to preserve voter anonymity
    const scrubbedBallot = {
        ...ballot,
        history: undefined,
        date_submitted: undefined,
        create_date: undefined,
        update_date: undefined,
        user_id: undefined,
        ip_hash: undefined
    };

    Logger.debug(req, "ballot = ", scrubbedBallot);
    res.json({ ballot: scrubbedBallot })
}

export {
    getBallotByBallotID
}
