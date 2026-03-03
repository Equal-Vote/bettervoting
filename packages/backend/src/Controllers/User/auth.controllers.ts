import Logger from "../../Services/Logging/Logger"
import { responseErr } from "../../Util"
import { permission } from "@equal-vote/star-vote-shared/domain_model/permissions"
import { roles } from "@equal-vote/star-vote-shared/domain_model/roles"
import ServiceLocator from "../../ServiceLocator"

const className = 'Auth.Controllers';
const accountService = ServiceLocator.accountService();

const getUser = (req: any, res: any, next: any) => {
  Logger.info(req, `${className}.getUser`);
  const user = accountService.extractUserFromRequest(req);
  if (user){
    req.user = user;
  }
  next()
}

const hasPermission = (permission: permission) => {
  return (req: any, res: any, next: any) => {
    Logger.debug(req, "\n= = = = =\n!!! hasPermission with: " + JSON.stringify(req.user_auth));
    if (!req.user_auth.roles.some( (role:roles) => permission.includes(role))) {
      var msg = "Does not have permission";
      Logger.info(req, msg);
      return responseErr(res, req, 401, msg);
    }
    next()
  }
}

const isLoggedIn = (req: any, res: any, next: any) => {
  Logger.info(req, `${className}.isLoggedIn user=${!!req.user}`);
  if (!req.user) {
    var msg = "Not Logged In";
    Logger.info(req, msg);
    return responseErr(res, req, 401, msg);
  }
  next()
}

const assertOwnership = (req: any, res: any, next: any) => {
  Logger.info(req, `${className}.assertOwnership`);
  Logger.debug(req, `${req.election.owner_id} ==? ${req.user.sub}`);
  if (req.election.owner_id != req.user.sub) {
    var msg = "Unauthorized: User does not own electon";
    Logger.info(req, msg);
    return responseErr(res, req, 401, msg);
  }
  next()
}

export  {
  getUser,
  isLoggedIn,
  assertOwnership,
  hasPermission
}
