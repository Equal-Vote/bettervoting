import { ElectionRoll, ElectionRollState } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";

const ElectionRollModel = ServiceLocator.electionRollDb();
const className = "VoterRolls.Controllers";
import { getOrCreateElectionRoll, checkForMissingAuthenticationData } from "./voterRollUtils"
import { BadRequest, InternalServerError, Unauthorized } from "@curveball/http-errors";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { makeUniqueID, ID_PREFIXES, ID_LENGTHS } from "@equal-vote/star-vote-shared/utils/makeID";
import { hashString } from "../controllerUtils";

const registerVoter = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.registerVoter ${req.election.election_id}`);

    const targetElection: Election | null = req.election;
    if (targetElection == null) {
        const errMsg = "Invalid election Id";
        Logger.info(req, errMsg);
        throw new BadRequest(errMsg);
    }

    if (targetElection.state !== 'open') {
        Logger.info(req, "Election not open.", targetElection);
        throw new BadRequest("Election is not open");
    }

    if (targetElection.settings.voter_access !== 'registration') {
        Logger.info(req, "Election does not allow registration", targetElection);
        throw new BadRequest("Election is not open");
    }

    const missingAuthData = checkForMissingAuthenticationData(req, targetElection, req)
    if (missingAuthData !== null) {
        throw new Unauthorized(missingAuthData);
    }
    let roll: ElectionRoll
    let tempRoll = await getOrCreateElectionRoll(req, targetElection, req);
    if (tempRoll == null) {
        roll = {
            voter_id: await makeUniqueID(
                ID_PREFIXES.VOTER,
                ID_LENGTHS.VOTER,
                async (id: string) => await ElectionRollModel.getByVoterID(req.election.election_id, id, req) !== null
            ),
            election_id: req.election.election_id,
            email: req.user?.email,
            submitted: false,
            ip_hash: targetElection.settings.voter_authentication.ip_address ? hashString(req.ip!) : undefined,
            state: ElectionRollState.registered,
            history: [],
            registration: req.body.registration,
            update_date: Date.now().toString(),
            head: true,
            create_date: new Date().toISOString(),
        }
    } else {
        roll = tempRoll
    }
    const history = {
        action_type: 'registered',
        actor: req.user.email,
        timestamp: Date.now(),
    }
    roll.history?.push(history)

    const NewElectionRoll = await ElectionRollModel.submitElectionRoll([roll], req, 'User Registered')
    if (!NewElectionRoll) {
        const msg = "Error submitting election roll";
        Logger.info(req, msg);
        throw new InternalServerError(msg)
    }

    res.status(200).json(JSON.stringify({ election: req.election, NewElectionRoll }))
    return next()
}

export  {
    registerVoter
}
