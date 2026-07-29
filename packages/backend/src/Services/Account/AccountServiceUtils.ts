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
        // Algorithm selection follows key shape: PEM public-key / certificate
        // means RS256; everything else (HS256 shared secrets, used by the test
        // mock) is symmetric. Callers that require RS256 specifically (e.g. the
        // election-scoped auth_key path) enforce that at their own layer.
        const isAsymmetric = key.includes('-----BEGIN PUBLIC KEY') || key.includes('-----BEGIN CERTIFICATE');
        const algorithms = isAsymmetric ? ['RS256'] : ['HS256'];

        try {
            return jwt.verify(token, key, { algorithms });
        } catch (e: any) {
            Logger.warn(req, "JWT Verify Error: ", e.message);
            throw new Unauthorized();
        }
    };
}
