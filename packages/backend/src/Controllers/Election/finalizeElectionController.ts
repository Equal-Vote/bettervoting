import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermanentUser, expectPermission, expectUpdateDate } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { innerDeleteAllBallotsForElectionID } from '../Ballot';

const ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const finalizeElection = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    Logger.info(req, `${className}.finalize ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)
    // Temp owners hold canEditElectionState during their access window, but finalizing
    // needs an account (the UI says "create a free account to finalize"); enforce it here too.
    expectPermanentUser(req.user)

    if (req.election.state !== 'draft') {
        const msg = "Election already finalized";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    const failMsg = "Failed to update Election";
    // Use a finalized copy for the OC-protected update; leave req.election in draft state
    // so the subsequent ballot-deletion's draft-state guard still passes.
    // Every election gets a max_rankings limit; default any election that never set one
    // (matches the frontend's REACT_APP_DEFAULT_BALLOT_RANKS default of 6).
    const DEFAULT_MAX_RANKINGS = Number(process.env.DEFAULT_BALLOT_RANKS) || 6;
    const finalizedElection = {
        ...req.election,
        state: 'finalized' as const,
        settings: {
            ...req.election.settings,
            max_rankings: req.election.settings.max_rankings ?? DEFAULT_MAX_RANKINGS,
        },
    }
    const expected_update_date = expectUpdateDate(req);
    const updatedElection = await ElectionsModel.updateElection(finalizedElection, req, `Finalizing election`, expected_update_date);
    if (!updatedElection) {
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    await innerDeleteAllBallotsForElectionID(req);

    res.json({ election: updatedElection })
}

export {
    finalizeElection
}
