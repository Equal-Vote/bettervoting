import { Election, getPrecinctFilteredElection, removeHiddenFields } from '@equal-vote/star-vote-shared/domain_model/Election';
import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { responseErr } from '../../Util';
import { IElectionRequest, IRequest } from '../../IRequest';
import { roles } from "@equal-vote/star-vote-shared/domain_model/roles"
import { getPermissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { getOrCreateElectionRoll, checkForMissingAuthenticationData, getVoterAuthorization } from "../Roll/voterRollUtils"
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { sharedConfig } from '@equal-vote/star-vote-shared/config';
import { hashString } from '../controllerUtils';


var ElectionsModel =  ServiceLocator.electionsDb();
var accountService = ServiceLocator.accountService();
const className="Elections.Controllers";

const getElectionByID = async (req: any, res: any, next: any) => {
    Logger.info(req, `${className}.getElectionByID ${req.params.id}`);
    if (!req.params.id){
        return next();
    }
    try {
        let election = await ElectionsModel.getElectionByID(req.params.id, req);

        req.election = election;
        return next();
    } catch (err:any) {
        let failMsg = 'Election not found';
        Logger.error(req, `${failMsg} electionId=${req.params.id}}`);
        return responseErr(res, req, 400, failMsg);
    }
}

const electionExistsByID = async (req: any, res: any, next: any) => {
    // using _id so that router.param() doesn't apply to it
    Logger.info(req, `${className}.getElectionExistsByID ${req.params._id}`);

    res.json({ exists: await ElectionsModel.electionExistsByID(req.params._id, req) })
}

const electionSpecificAuth = async (req: IRequest, res: any, next: any) => {
    if (!req.election){
        return next();
    }
    const electionKey = req.election.auth_key;
    if (electionKey == null || electionKey == ""){
        return next();
    }
    var user = accountService.extractUserFromRequest(req, electionKey);
    req.user = user;
    return next();
}

const electionPostAuthMiddleware = async (req: IElectionRequest, res: any, next: any) => {
    Logger.info(req, `${className}.electionPostAuthMiddleware ${req.params.id}`);
    try {
        // Update Election State
        var election = req.election;
        if (!election){
            var failMsg = "Election not found";
            Logger.info(req, `${failMsg} electionId=${req.params.id}`);
            return responseErr(res, req, 400, failMsg);
        }
        election = await updateElectionStateIfNeeded(req, election);

        req.election = election;

        req.user_auth = {
            roles: [],
            permissions: []
        }
        // HACK: The convention is the only way we can tell if an election is owned by a temp_id or a logged in user
        // temp_id follows v-abc123, whereas keycloak is a uuid
        // we should only allow temporary edit permissions on elections that follow the temp_id convention
        // this alleviates any concerns that someone could gain edit access by tweaking their local temp_id cookie
        const ownerIsTempUser = req.election.owner_id.startsWith('v-');
        const hoursSinceCreate = (new Date().getTime() - new Date(election.create_date).getTime()) / (1000 * 60 * 60)
        const tempUserAuth =
            ownerIsTempUser && 
            req.election.owner_id == req.cookies.temp_id &&
            hoursSinceCreate < sharedConfig.TEMPORARY_ACCESS_HOURS &&
            hashString(req.cookies[`${req.election.election_id}_claim_key`]) === req.election.claim_key_hash;

        // NOTE: req.user.typ doesn't apply here, since a user can have temp ownership of an election, while also being logged in
        if (req.user && req.election){
          if(req.election.owner_id == req.user.sub || tempUserAuth){
            req.user_auth.roles.push(roles.owner)
          }
          if (req.election.admin_ids && req.election.admin_ids.includes(req.user.email)){
            req.user_auth.roles.push(roles.admin)
          }
          if (req.election.audit_ids && req.election.audit_ids.includes(req.user.email)){
            req.user_auth.roles.push(roles.auditor)
          }
          if (req.election.credential_ids && req.election.credential_ids.includes(req.user.email)){
            req.user_auth.roles.push(roles.credentialer)
          }
        }
        req.user_auth.permissions = getPermissions(req.user_auth.roles)
        Logger.debug(req, `done with electionPostAuthMiddleware...`);
        Logger.debug(req,req.user_auth);
        return next();
    } catch (err:any) {
        var failMsg = "Could not modify election";
        Logger.error(req, `${failMsg} ${err.message}`);
        return responseErr(res, req, 500, failMsg);
    }
}

async function updateElectionStateIfNeeded(req:IRequest, election:Election):Promise<Election> {
    if (election.state === 'draft') {
        return election;
    }

    const currentTime = new Date();
    var stateChange = false;
    var stateChangeMsg = "";

    if (election.state === 'finalized') {
        var openElection = false;
        if (election.start_time) {
            const startTime = new Date(election.start_time);
            if (currentTime.getTime() > startTime.getTime()) {
                openElection = true;
            }
        } else {
            openElection = true;
        }
        if (openElection){
            stateChange = true;
            election.state = 'open';
            stateChangeMsg = `Election ${election.election_id} Transitioning to Open From ${election.state} (start time = ${election.start_time})`;
        }
    }
    if (election.state === 'open') {
        if (election.end_time) {
            const endTime = new Date(election.end_time);
            if (currentTime.getTime() > endTime.getTime()) {
                stateChange = true;
                election.state = 'closed';
                stateChangeMsg = `Election ${election.election_id} transitioning to Closed From ${election.state} (end time = ${election.end_time})`;
            }
        }
    }
    if (stateChange) {
        election = await ElectionsModel.updateElection(election, req, stateChangeMsg);
        Logger.info(req, stateChangeMsg);
    }
    return election;
}

const returnElection = async (req: any, res: any, next: any) => {
    Logger.info(req, `${className}.returnElection ${req.params.id}`)
    var election = req.election;
    
    const missingAuthData = checkForMissingAuthenticationData(req, election, req)
    let roll:ElectionRoll|null = null
    if (missingAuthData === null) {
        roll = await getOrCreateElectionRoll(req, election, req);
    }
    const voterAuthorization = getVoterAuthorization(roll,missingAuthData)
    removeHiddenFields(election)
    res.json({
        election: election,
        precinctFilteredElection: getPrecinctFilteredElection(election, roll),
        voterAuth: { authorized_voter: voterAuthorization.authorized_voter, has_voted: voterAuthorization.has_voted, required: voterAuthorization.required, roles: req.user_auth.roles, permissions: req.user_auth.permissions }
    })
}

export  {
    returnElection,
    getElectionByID,
    electionSpecificAuth,
    electionPostAuthMiddleware,
    electionExistsByID
}
