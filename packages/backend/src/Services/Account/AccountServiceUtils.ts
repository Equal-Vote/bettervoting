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
        // TODO: migrate to storing an explicitly-defined auth_algorithm value in the election db
        const isCustomKeyAsymmetric = key.includes('-----BEGIN PUBLIC KEY') || key.includes('-----BEGIN CERTIFICATE');
        const algorithms = isCustomKeyAsymmetric ? ['RS256'] : ['HS256'];

        try {
            return jwt.verify(token, key, { algorithms });
        } catch (e: any) {
            Logger.warn(req, "JWT Verify Error: ", e.message);
            throw new Unauthorized();
        }
    };
}
