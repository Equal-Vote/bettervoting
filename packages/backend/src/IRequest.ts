import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { roles } from '@equal-vote/star-vote-shared/domain_model/roles';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';

type p = keyof typeof permissions

// Shape of the decoded JWT / temp-id payload set on req.user. jsonwebtoken has no installed
// type declarations (see untyped-modules.d.ts), so this is asserted rather than inferred.
export interface IUser {
    sub?: string;
    email?: string;
    // Set by Keycloak (and optionally by an election's own auth_key signer). Read it
    // through getVerifiedEmail (Controllers/verifiedEmail.ts), never directly.
    email_verified?: boolean;
    typ?: string;
    username?: string;
    [key: string]: unknown;
}

export interface IRequest extends Request {
    contextId?: string;
    logPrefix?: string;
    user?: IUser;
    // True when the election has an auth_key, so req.user (if any) came from a token
    // signed by that election's key rather than from a BetterVoting account.
    electionKeyAuth?: boolean;
}

export interface IElectionRequest extends IRequest {
    election: Election;
    user_auth: {
        roles: roles[];
        permissions: p[]
    }
    authorized_voter?: boolean;
    has_voted?: boolean;

}

export function reqIdSuffix(req:IRequest):string {
    return ` (${req.contextId})`;
}

export function iRequestMiddleware(req:IRequest, _res:Response, next:NextFunction):void {
    req.contextId = randomUUID().slice(0,8);
    next();
}