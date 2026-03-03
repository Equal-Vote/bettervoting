import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionRoll, ElectionRollState } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { IRequest } from "../../IRequest";
import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { InternalServerError, Unauthorized } from "@curveball/http-errors";
import { ILoggingContext } from "../../Services/Logging/ILogger";
import { hashString } from "../controllerUtils";
import { makeUniqueID, ID_LENGTHS, ID_PREFIXES } from "@equal-vote/star-vote-shared/utils/makeID";

const ElectionRollModel = ServiceLocator.electionRollDb();

export async function getOrCreateElectionRoll(req: IRequest, election: Election, ctx: ILoggingContext, voter_id_override?: string, skipStateCheck?: boolean): Promise<ElectionRoll | null> {
    // Checks for existing election roll for user
    Logger.info(req, `getOrCreateElectionRoll`)
    const ip_hash = hashString(req.ip!)
    // Get data that is used for voter authentication
    // NOTE: I'm ensuring that undefined is coaleced into null, that makes it compliant with the type when calling getElectionRoll
    const require_ip_hash = (election.settings.voter_authentication.ip_address ? ip_hash : null) ?? null;
    const email = election.settings.voter_authentication.email ? req.user?.email : null
    
    // Get voter ID if required and available, otherwise set to null
    let voter_id = null
    if (election.settings.voter_authentication.voter_id && election.settings.voter_access == 'closed') {
        // cookies don't support special charaters
        // https://help.vtex.com/en/tutorial/why-dont-cookies-support-special-characters--6hs7MQzTri6Yg2kQoSICoQ
        voter_id = voter_id_override ?? atob(req.cookies?.voter_id); 
    } else if (election.settings.voter_authentication.voter_id && election.settings.voter_access == 'open') {
        voter_id = voter_id_override ?? req.user?.sub
    }

    // Get all election roll entries that match any of the voter authentication fields
    // This is an odd way of going about this, rather than getting a roll that matches all three we get all that match any of the fields and
    // check the output for a number of edge cases.
    var electionRollEntries = null
    if ((require_ip_hash || email || voter_id)) {
        electionRollEntries = await ElectionRollModel.getElectionRoll(String(election.election_id), voter_id, email, require_ip_hash, ctx);
    }

    if (electionRollEntries == null) {
        // No election roll found, create one if voter access is open and election state is open
        if (election.settings.voter_access !== 'open') return null
        if (!skipStateCheck && election.state !== 'open') return null

        Logger.info(req, "Creating new roll");
        const new_voter_id = election.settings.voter_authentication.voter_id ? 
            voter_id : 
            await makeUniqueID(
                ID_PREFIXES.VOTER,
                ID_LENGTHS.VOTER,
                async (id: string) => await ElectionRollModel.getByVoterID(String(election.election_id), id, ctx) !== null,
            );
        const history = [{
            action_type: ElectionRollState.approved,
            actor: new_voter_id,
            timestamp: Date.now(),
        }]
        const roll: ElectionRoll[] = [{
            election_id: String(election.election_id),
            email: req.user?.email ? req.user.email : undefined,
            voter_id: new_voter_id,
            ip_hash: ip_hash,
            submitted: false,
            state: ElectionRollState.approved,
            history: history,
            update_date: Date.now().toString(),
            head: true,
            create_date: new Date().toISOString(),
        }]
        if ((require_ip_hash || email || voter_id)) {
            const newElectionRoll = await ElectionRollModel.submitElectionRoll(roll, ctx, `User requesting Roll and is authorized`)
            if (!newElectionRoll) {
                Logger.error(ctx, "Failed to update ElectionRoll");
                throw new InternalServerError();
            }
            return roll[0];
        }
        else {
            return roll[0]
        }
    }


    if (electionRollEntries.length > 1) {
        // Multiple election rolls match some of the authentication fields, shouldn't occur but throw error if it does
        // Maybe could happen if someone submits valid voter ID seperate valid email
        Logger.error(req, "Multiple election roll entries found", electionRollEntries);
        throw new InternalServerError('Multiple election roll entries found');
    }
    if (election.settings.voter_authentication.ip_address && electionRollEntries[0].ip_hash) {
        if (electionRollEntries[0].ip_hash !== ip_hash) {
            Logger.error(req, "IP Address does not match saved voter roll", electionRollEntries);
            throw new Unauthorized('IP Address does not match saved voter roll');
        }
    }
    if (election.settings.voter_authentication.email && electionRollEntries[0].email !== email) {
        // Email doesn't match saved election roll, for example if email and voter ID are selected but email doesn't match the voter ID 
        Logger.error(req, "Email does not match saved election roll", electionRollEntries);
        throw new Unauthorized('Email does not match saved election roll');
    }
    if (election.settings.voter_authentication.voter_id && electionRollEntries[0].voter_id.trim() !== voter_id.trim()) {
        // Voter ID does not match saved election roll, for example if email and voter ID are selected but email doesn't match the voter ID 
        Logger.error(req, "Voter ID does not match saved election roll", electionRollEntries);
        throw new Unauthorized('Voter ID does not match saved voter roll');
    }

    return electionRollEntries[0]

}

// NOTE: voter_id can be directly passed in for bulk ballot uploads, but usually it will be retrieved from the cookies
export function checkForMissingAuthenticationData(req: IRequest, election: Election, ctx: ILoggingContext, voter_id?: string): string | null {
    // Checks that user has provided all data needed for authentication
    Logger.info(req, `checkForMissingAuthenticationData`)
    if ((election.settings.voter_authentication.voter_id && election.settings.voter_access == 'closed') && !(voter_id ?? req.cookies?.voter_id)) {
        return 'Voter ID Required'
    }
    // Arend's Note: I don't think 'User ID Required' is used anymore, might be a remnant of when we were thinking of custom authentication flows, but we don't have a clear story for that at the moment.
    // Arend's second note: This is still possible, this happens with "one vote per device" security settings and the cookies aren't set properly
    if ((election.settings.voter_authentication.voter_id && election.settings.voter_access == 'open') && !(req.user)) {
        return 'User ID Required'
    }
    if (election.settings.voter_authentication.email && !(req.user?.email)) {
        return 'Email Validation Required'
    }
    return null
}

export function getVoterAuthorization(roll: ElectionRoll | null, missingAuthData: string | null) {
    Logger.info(undefined, `getVoterAuthorization`)
    if (missingAuthData !== null) {
        Logger.info(undefined, missingAuthData)
        return {
            authorized_voter: false,
            required: missingAuthData,
            has_voted: false,
        }
    }
    if (roll === null) {
        return {
            authorized_voter: false,
            has_voted: false,
        }
    }
    return {
        authorized_voter: true,
        has_voted: roll.submitted,
    }
} 
