import Logger from "../../Services/Logging/Logger";
import { NotImplemented } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const className = "VoterRolls.Controllers";

const registerVoter = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.registerVoter ${req.election?.election_id}`);

    // Reachable via POST /API/Election/:id/register, but no frontend code calls it
    // and the implementation was never finished: it wrote a `registration` field that
    // no other code path reads, and the `voter_access: 'registration'` mode it gated
    // on is not exercised anywhere. Failing loudly so we notice if anyone tries.
    throw new NotImplemented("Voter registration is not implemented");
}

export  {
    registerVoter
}
