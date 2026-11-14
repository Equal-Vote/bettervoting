import { Forbidden, Unauthorized } from "@curveball/http-errors";
import { Response, NextFunction } from 'express';
import { IRequest, IUser } from "../IRequest";

// An email address only counts as the caller's identity when the token that carries it
// also says the address was verified. Keycloak sets `email_verified` on every id token;
// a missing claim is treated the same as `false`, so a realm or client-scope change that
// drops the claim fails closed instead of silently trusting unverified addresses.
// Temp-id users (a bare cookie) never have an email.
export function getVerifiedEmail(user: IUser | null | undefined): string | null {
    if (!user || user.typ === 'TEMP_ID') return null;
    if (typeof user.email !== 'string' || user.email === '') return null;
    return user.email_verified === true ? user.email : null;
}

// True when the caller presented an email that we refuse to trust. Lets callers tell
// "sign in" apart from "verify your email" in the message they return.
export function hasUnverifiedEmail(user: IUser | null | undefined): boolean {
    return !!user && user.typ !== 'TEMP_ID'
        && typeof user.email === 'string' && user.email !== ''
        && user.email_verified !== true;
}

// For powers that cost the platform something or reach third parties (sending email,
// hosting uploads): the caller must be a BetterVoting account with a verified email.
// An identity signed by an election's own auth_key does not qualify, because anyone can
// create an election with a key of their choosing and sign whatever claims they like.
// `action` completes the sentence "... to <action>".
export function expectVerifiedAccount(req: IRequest, action: string): string {
    const user = req.electionKeyAuth ? undefined : req.user;
    if (!user?.sub || user.typ === 'TEMP_ID') {
        throw new Unauthorized(`Sign in with a verified email address to ${action}`);
    }
    const email = getVerifiedEmail(user);
    if (email === null) {
        throw new Forbidden(`Verify your email address to ${action}`);
    }
    return email;
}

// Route-level form of expectVerifiedAccount, for use ahead of body parsers such as multer
// so that an unqualified caller is refused before the server reads their upload.
export const requireVerifiedAccount = (action: string) =>
    (req: IRequest, _res: Response, next: NextFunction) => {
        try {
            expectVerifiedAccount(req, action);
            next();
        } catch (err: unknown) {
            next(err);
        }
    };
