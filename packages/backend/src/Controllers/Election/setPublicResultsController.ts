import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission, expectUpdateDate } from "../controllerUtils";
import { parseAuditNote } from "../auditNote";
import { BadRequest } from "@curveball/http-errors";
import { canRevealResults } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionsModel = ServiceLocator.electionsDb();

const className = "election.Controllers";

const setPublicResults = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    Logger.info(req, `${className}.setPublicResults ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canEditElectionState)
    const election: Election = req.election
    const public_results = req.body.public_results
    if (typeof public_results !== 'boolean') {
        throw new BadRequest('public_results setting not provided or incorrect type')
    }
    // Hiding is always allowed. Revealing while votes can still come in is only for an
    // election that was set up, in draft, to allow preliminary results.
    if (public_results && !canRevealResults(election)) {
        throw new BadRequest('This election does not allow preliminary results, so its results can only be revealed once it is closed')
    }
    election.settings.public_results = public_results

    const expected_update_date = expectUpdateDate(req);
    const updatedElection = await ElectionsModel.updateElection(election, req, public_results ? `Reveal Results` : `Hide Results`, expected_update_date, parseAuditNote(req));
    if (!updatedElection) {
        const failMsg = 'could not update public_results setting'
        Logger.info(req, failMsg);
        throw new BadRequest(failMsg)
    }

    res.json({ election: updatedElection })
}

export  {
    setPublicResults,
}
