import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { Unauthorized } from "@curveball/http-errors";
import { expectPermission, secureShuffle } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const BallotModel = ServiceLocator.ballotsDb();

const getBallotsByElectionID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    var electionId = req.election.election_id;
    Logger.debug(req, "getBallotsByElectionID: " + electionId);

    expectPermission(req.user_auth.roles, permissions.canViewBallots)
    if (!req.election.settings.public_results && req.election.state !== 'closed') {
        const msg = `Ballot access only permited when public results are enabled or election has closed`;
        Logger.info(req, msg);
        throw new Unauthorized(msg)
    }

    const ballots = await BallotModel.getBallotsByElectionID(String(electionId), req);

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

    // Shuffle so the response order doesn't reveal ballot submission order —
    // an admin could otherwise zip it against the roll's per-voter timestamps
    // to deanonymize every vote.
    const shuffledBallots = secureShuffle(scrubbedBallots);

    Logger.debug(req, "ballots = ", shuffledBallots);
    res.json({ election: req.election, ballots: shuffledBallots })
}

export {
    getBallotsByElectionID
}
