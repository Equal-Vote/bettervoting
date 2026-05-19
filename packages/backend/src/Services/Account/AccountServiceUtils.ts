import { IRequest } from "../../IRequest";
import Logger from "../Logging/Logger";

import { Unauthorized } from "@curveball/http-errors";
const jwt = require("jsonwebtoken");

export default class AccountServiceUtils {
    static extractUserFromRequest = (
        req: IRequest,
        token: string,
        key: string
    ) => {
        // RS256-only. Reject HS256 / raw-secret keys even if a legacy row in the
        // DB has one — symmetric keys imply the platform holds material that can
        // authenticate as the election owner, which we no longer permit.
        if (!key.includes('-----BEGIN PUBLIC KEY')) {
            Logger.warn(req, "auth_key rejected: not a PEM-encoded RS256 public key");
            throw new Unauthorized();
        }
        try {
            return jwt.verify(token, key, { algorithms: ['RS256'] });
        } catch (e: any) {
            Logger.warn(req, "JWT Verify Error: ", e.message);
            throw new Unauthorized();
        }
    };
}
