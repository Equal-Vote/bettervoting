import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest } from "@curveball/http-errors";
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { AnonymizedBallot } from "@equal-vote/star-vote-shared/domain_model/Ballot";


const BallotModel = ServiceLocator.ballotsDb();

export const getAnonymizedBallotsByElectionID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    var electionId = req.election.election_id;
    Logger.debug(req, "getBallotsByElectionID: " + electionId);
    const election = req.election;
    if (!election.settings.public_results) {
        expectPermission(req.user_auth.roles, permissions.canViewBallots)
    }

    const ballots = await BallotModel.getBallotsByElectionID(String(electionId), req);
    if (!ballots) {
        const msg = `Ballots not found for Election ${electionId}`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }
    const anonymizedBallots: AnonymizedBallot[] = ballots.filter(ballot => {
        return ballot.status === "submitted" && ballot.head;
    }).map((ballot) => {
            return {
                ballot_id: ballot.ballot_id,
                election_id: ballot.election_id,
                precinct: ballot.precinct,
                votes: ballot.votes
            }
      
    });
    Logger.debug(req, "ballots = ", anonymizedBallots);
    res.json({ ballots: anonymizedBallots })
}

