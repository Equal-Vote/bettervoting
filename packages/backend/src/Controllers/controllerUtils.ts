import { IRequest, reqIdSuffix } from "../IRequest"
import { Election, electionValidation } from "@equal-vote/star-vote-shared/domain_model/Election";
import Logger from "../Services/Logging/Logger"
import { BadRequest, Unauthorized } from "@curveball/http-errors";
import { Response } from 'express';
import { roles } from "@equal-vote/star-vote-shared/domain_model/roles";
import { permission } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { createHash } from "crypto";
import ServiceLocator from "../ServiceLocator";
import { makeUniqueID , ID_LENGTHS } from "@equal-vote/star-vote-shared/utils/makeID";
const ElectionsModel =  ServiceLocator.electionsDb();

export async function expectValidElectionFromRequest(req:IRequest):Promise<Election> {
    const inputElection = req.body.Election;
    inputElection.election_id = await makeUniqueID(
        null,
        ID_LENGTHS.ELECTION,
        async (id: string) => Boolean(await ElectionsModel.electionExistsByID(id, req))
    );
    inputElection.create_date = new Date().toISOString()
    const validationErr = electionValidation(inputElection);
    if (validationErr) {
        Logger.info(req, "Invalid Election: " + validationErr, inputElection);
        throw new BadRequest("Invalid Election " + validationErr);
    }
    return inputElection;
}

export function catchAndRespondError(req:IRequest, res:Response, err:any):Response<any, Record<string, any>> {
    var status = 500;
    if (err.httpStatus) {
        status = err.httpStatus;
    }
    var msg = "Error";
    if (err.detail) {
        msg = err.detail;
    }
    msg += reqIdSuffix(req);
    return res.status(status).json({error:msg});
}

export function expectPermission(roles:roles[],permission:permission):any {
        if (!roles.some( (role) => permission.includes(role))){
            throw new Unauthorized("Does not have permission")
      }
}

// Note: it feels weird to have the same util function on both frontend and backend instead of using shared, but they need to use different libraries
export function hashString(inputString: string) {
    return createHash('sha256').update(inputString).digest('hex')
}