import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

var ElectionsModel = ServiceLocator.electionsDb();
const className = "Elections.Controllers";

const deleteElection = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    expectPermission(req.user_auth.roles, permissions.canDeleteElection)
    const electionId = req.election.election_id;
    Logger.info(req, `${className}.deleteElection ${electionId}`)
    const success = await ElectionsModel.delete(electionId, req, `User manually deleting election`);
    if (!success) {
        var msg = "Nothing to delete";
        Logger.error(req, msg);
        throw new BadRequest(msg)
    }
    Logger.info(req, `Deleted election ${electionId}`);
    res.status(200).send('Election Deleted');

}
export  {
    deleteElection
}