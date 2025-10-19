import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, Unauthorized } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionRollModel = ServiceLocator.electionRollDb();

const className = "VoterRolls.Controllers";

const getRollsByElectionID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    expectPermission(req.user_auth.roles, permissions.canViewElectionRoll)
    if(req.election.settings.voter_access === 'open'){
        throw new Unauthorized("Can't view voter roll for open elections")
    }
    const electionId = req.election.election_id;
    Logger.info(req, `${className}.getRollsByElectionID ${electionId}`);
    //requires election data in req, adds entire election roll

    const electionRoll = await ElectionRollModel.getRollsByElectionID(electionId, req);
    if (!electionRoll) {
        const msg = `Election roll for ${electionId} not found`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    // Scrub ballot_id to prevent linking voters to ballots
    const scrubbedRoll = electionRoll.map(roll => ({
        ...roll,
        ballot_id: undefined,
        ip_hash: undefined
    }));

    Logger.debug(req, `Got Election: ${req.params.id}`);
    Logger.info(req, `${className}.returnRolls ${req.params.id}`);
    res.json({ election: req.election, electionRoll: scrubbedRoll });
}

const getByVoterID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.getByVoterID ${req.election.election_id} ${req.params.voter_id}`)
    expectPermission(req.user_auth.roles, permissions.canViewElectionRoll)
    const electionRollEntry = await ElectionRollModel.getByVoterID(req.election.election_id, req.params.voter_id, req)
    if (!electionRollEntry) {
        const msg = "Voter Roll not found";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    // Scrub ballot_id to prevent linking voters to ballots
    const scrubbedEntry = {
        ...electionRollEntry,
        ballot_id: undefined,
        ip_hash: undefined
    };

    res.json({ electionRollEntry: scrubbedEntry })
    next()
}

export {
    getRollsByElectionID,
    getByVoterID
}
