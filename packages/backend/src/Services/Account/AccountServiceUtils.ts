import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
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
        const inputElection: Election | undefined = req.body.Election;
        if (inputElection && inputElection.auth_key && inputElection.auth_key != "") {
            Logger.debug(
                req,
                "have input election with custom authKey",
                inputElection.auth_key
            );
            key = inputElection.auth_key;
        }
        try {
            return jwt.verify(token, key);
        } catch (e: any) {
            Logger.warn(req, "JWT Verify Error: ", e.message);
            throw new Unauthorized();
        }
    };
}
