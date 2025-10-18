import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest } from "@curveball/http-errors";
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const BallotModel = ServiceLocator.ballotsDb();

const getBallotsByElectionID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    var electionId = req.election.election_id;
    Logger.debug(req, "getBallotsByElectionID: " + electionId);

    expectPermission(req.user_auth.roles, permissions.canViewBallots)

    const ballots = await BallotModel.getBallotsByElectionID(String(electionId), req);
    if (!ballots) {
        const msg = `Ballots not found for Election ${electionId}`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    // Scrub identifying information from ballots to preserve voter anonymity
    const scrubbedBallots = ballots.map(ballot => ({
        ...ballot,
        history: undefined,
        date_submitted: undefined,
        create_date: undefined,
        update_date: undefined,
        user_id: undefined,
        ip_hash: undefined
    }));

    Logger.debug(req, "ballots = ", scrubbedBallots);
    res.json({ election: req.election, ballots: scrubbedBallots })
}

export {
    getBallotsByElectionID
}
