import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const BallotModel = ServiceLocator.ballotsDb();

const getBallotByVoterID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    var electionId = req.election.election_id;
    var voterId = req.params.voter_id;
    Logger.debug(req, `getBallotByVoterID: ${voterId}`);
    
    let ballot;
    try {
        ballot = await BallotModel.getBallotByVoterID(voterId, electionId, req);
    } catch (e: any){
        const msg = 'Failed to retrieve ballot';
        Logger.error(req, msg, e);
        throw new InternalServerError(msg);
    }

    if (!ballot) {
        const msg = `Ballot not found for voter: ${voterId} election ${electionId}`;
        Logger.info(req, msg);
        res.sendStatus(204)
    } else {

        const scrubbedBallot = {
            ...ballot,
            ballot_id: undefined,
            history: undefined,
            date_submitted: undefined,
            create_date: undefined,
            update_date: undefined,
            user_id: undefined,
            ip_hash: undefined
        };

        Logger.debug(req, `ballot:  ${scrubbedBallot}`);
        res.json({ ballot: scrubbedBallot });
    }
}

export {
    getBallotByVoterID
}

