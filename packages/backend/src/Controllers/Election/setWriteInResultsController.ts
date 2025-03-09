import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

var ElectionsModel = ServiceLocator.electionsDb();

const setWriteInResults = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `setWriteInResults ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canProcessWriteIns)
    const election = req.election
    const write_in_results = req.body.write_in_results

    if (typeof write_in_results !== 'object') {
        throw new BadRequest('write_in_results setting not provided or incorrect type')
    }

    const race_index = election.races.map(race => race.race_id).indexOf(write_in_results.race_d);
    if (race_index != -1) {
        throw new BadRequest('Invalid Race ID')
    }
    if (!election.races[race_index].enable_write_in) {
        throw new BadRequest('Write-In not enabled for this race')
    }
    election.races[race_index].write_in_candidates = write_in_results.write_in_candidates

    const updatedElection = await ElectionsModel.updateElection(election, req, `Update Write-In Candidates`);
    if (!updatedElection) {
        const failMsg = 'could not update write in candidates'
        Logger.info(req, failMsg);
        throw new InternalServerError(failMsg)
    }

    res.json({ election: updatedElection })
}

export {
    setWriteInResults,
}