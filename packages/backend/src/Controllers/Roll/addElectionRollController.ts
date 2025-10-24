import { ElectionRoll, ElectionRollState } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { sharedConfig } from "@equal-vote/star-vote-shared/config";
import { makeUniqueID, ID_LENGTHS, ID_PREFIXES } from "@equal-vote/star-vote-shared/utils/makeID";

interface ElectionRollInput {
    voter_id?: string;
    email?: string;
    precinct?: string;
    state?: ElectionRollState;
}

const ElectionRollModel = ServiceLocator.electionRollDb();

const className = "VoterRolls.Controllers";

const addElectionRoll = async (req: IElectionRequest & { body: { electionRoll: ElectionRollInput[] } }, res: Response, next: NextFunction) => {
    expectPermission(req.user_auth.roles, permissions.canAddToElectionRoll)
    Logger.info(req, `${className}.addElectionRoll ${req.election.election_id}`);

    // Prevent creating voters by voter_id when using email invitations
    if (req.election.settings.invitation === 'email') {
        const hasVoterId = req.body.electionRoll.some((rollInput: ElectionRollInput) => rollInput.voter_id);
        if (hasVoterId) {
            throw new BadRequest('Cannot create voters with voter_id when using email invitations');
        }
    }

    const history = [{
        action_type: "added",
        actor: req.user.email,
        timestamp: Date.now(),
    }]
    if (req.election.settings.invitation === "email" && req.body.electionRoll.some((r: ElectionRollInput) => r.voter_id)) {
        throw new BadRequest("User provided voterIds are not permitted for email list elections");
    }
    
    // Generate all IDs in parallel first
    const idPromises: Promise<string>[] = req.body.electionRoll.map((rollInput: ElectionRollInput) =>
        rollInput.voter_id || makeUniqueID(
            ID_PREFIXES.VOTER,
            ID_LENGTHS.VOTER,
            async (id: string) => await ElectionRollModel.getByVoterID(req.election.election_id, id, req) !== null
        )
    );
    const voterIds = await Promise.all(idPromises);
    
    // Then create the rolls array using the pre-generated IDs
    const rolls: ElectionRoll[] = req.body.electionRoll.map((rollInput: ElectionRollInput, index: number) => ({
        voter_id: voterIds[index],
        election_id: req.election.election_id,
        email: rollInput.email,
        submitted: false,
        precinct: rollInput.precinct,
        state: rollInput.state || ElectionRollState.approved,
        history: history,
        create_date: new Date().toISOString(),
        update_date: Date.now().toString(),
        head: true
    }));
    // TODO: move this to a dedicated database querry
    const existingRolls = await ElectionRollModel.getRollsByElectionID(req.election.election_id, req)

    if (existingRolls) {
        // Check if rolls already exist
        const duplicateRolls = req.body.electionRoll.filter((roll: ElectionRoll) => {
            return existingRolls.some(existingRoll => {
                if (existingRoll.email && roll.email && existingRoll.email === roll.email) return true
                if (existingRoll.voter_id && roll.voter_id && existingRoll.voter_id === roll.voter_id) return true
                return false
            })
        })
        if (duplicateRolls.length > 0) {
            throw new BadRequest(`Some submitted voters already exist: ${duplicateRolls.map( (roll: ElectionRoll) => `${roll.voter_id ? roll.voter_id : ''} ${roll.email ? roll.email : ''}`).join(',')}`)
        }

        // Check for roll limit
        let overrides = sharedConfig.ELECTION_VOTER_LIMIT_OVERRIDES as { [key: string]: number};
        let voterLimit = overrides[req.election.election_id] ?? sharedConfig.FREE_TIER_PRIVATE_VOTER_LIMIT;
        if(req.election.settings.voter_access == 'closed' && existingRolls.length + req.body.electionRoll.length > voterLimit){
            throw new BadRequest(`Request Denied: this election is limited to ${voterLimit} voters`);
        }
    }


    const newElectionRoll = await ElectionRollModel.submitElectionRoll(rolls, req, `User adding Election Roll??`)
    if (!newElectionRoll) {
        const msg = "Voter Roll not found";
        Logger.error(req, "= = = = = = \n = = = = = ");
        Logger.info(req, msg);
        throw new InternalServerError(msg);
    }

    res.status(200).json({ election: req.election, newElectionRoll });
    return next()
}

export {
    addElectionRoll,
}
