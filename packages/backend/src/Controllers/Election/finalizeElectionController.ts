import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission, expectUpdateDate } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { innerDeleteAllBallotsForElectionID } from '../Ballot';

var ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const finalizeElection = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.finalize ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)

    if (req.election.state !== 'draft') {
        var msg = "Election already finalized";
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    // NOTE: this used to fetch the entire election roll here and null-check it. The
    // result was never read, and getRollsByElectionID resolves to [] rather than null
    // for an empty roll, so the guard could never fire -- it was a full-table read that
    // did nothing. If the intent was "don't finalize an email election with no voters",
    // that wants an explicit count(*) check and is a deliberate behaviour change, so
    // it's left out here rather than smuggled in.

    var failMsg = "Failed to update Election";
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
