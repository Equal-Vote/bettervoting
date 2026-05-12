import { timeZones, TimeZone } from "./Util";
import { ElectionState } from "./ElectionStates"

export interface registration_field {
  field_name: string;
  field_type: 'text' | 'photo';
  help_text?: string;
}

export interface authentication {
  voter_id?: boolean;
  email?: boolean;
  phone?: boolean;
  registration_data?: [registration_field];
  registration_api_endpoint?: string;
  address?: boolean;
  ip_address?: boolean
}
const TermTypes = ['poll', 'election'] as const;
export type TermType = typeof TermTypes[number];
const VoterAcessArray = ['open', 'closed', 'registration'] as const;
export type VoterAccess = typeof VoterAcessArray[number];
const InvitationTypes = ['email', 'address'] as const;
export type InvitationType = typeof InvitationTypes[number];

export interface ElectionSettings {
    voter_access?:         VoterAccess;  //   Who is able to vote in election?
    voter_authentication: authentication; // How will voters be authenticated?
    invitation?:          InvitationType; // How will invites be sent? Requires voter_access='closed'
    reminders?:           boolean; //   Send reminders to voters who haven't voted? Requires voter_access='closed'
    ballot_updates?:	    boolean; //		allows voters to update their ballots before election ends
    public_results?:	    boolean; //		allows public to view results
    time_zone?:           TimeZone; // Time zone for displaying election start/end times
    random_candidate_order?: boolean; // Randomize order of candidates on the ballot
    require_instruction_confirmation?: boolean; // Require voter to confirm that they've read the instructions in order to vote
    break_ties_randomly?: boolean; // whether true ties should be broken randomly
    term_type?: TermType; // whether poll or election should be used as the term
    max_rankings?: number; // maximum rank limit for ranked choice voting
    email_campaign_count?: number;
    contact_email?: string; // Public contact email for voters to reach out to
    exhaust_on_N_repeated_skipped_marks?: number; // number of skipped ranks before exhausting
    draggable_ballot?: boolean; // Use draggable interface for IRV ballots
}
function authenticationValidation(obj:authentication): string | null {
  if (!obj){
    return "Authentication is null";
  }
  if (obj.voter_id !== undefined && typeof obj.voter_id !== 'boolean'){
    return "Invalid Voter ID";
  }
  if (obj.email !== undefined && typeof obj.email !== 'boolean'){
    return "Invalid Email";
  }
  if (obj.ip_address !== undefined && typeof obj.ip_address !== 'boolean'){
    return "Invalid IP Address";
  }
  // phone, address, registration_data, registration_api_endpoint are latent fields
  // not exposed by any UI; reject them to keep elections in one of the 6 canonical shapes.
  if (obj.phone !== undefined || obj.address !== undefined ||
      obj.registration_data !== undefined || obj.registration_api_endpoint !== undefined){
    return "Unsupported voter_authentication field (phone/address/registration_data/registration_api_endpoint)";
  }
  const trueCount = [obj.voter_id, obj.email, obj.ip_address].filter(v => v === true).length;
  if (trueCount > 1){
    return "Only one of voter_id, email, or ip_address may be enabled";
  }
  return null;
}

function settingsCompatiblityValidation(settings: ElectionSettings, electionState?: ElectionState): string {
    let errorMsg = ''
    if (settings.ballot_updates) {
        if (settings.public_results && !['closed', 'archived'].includes(electionState ?? '')) {
            errorMsg += 'Preliminary results are not permitted when ballot updating is enabled.  ';
        }
        if (settings.voter_access == 'open') {
            errorMsg += 'Ballot updating is not permitted on open access elections.  ';
        }
        if (settings.invitation != 'email') {
            errorMsg += 'Ballot updating is only permitted on email list elections.  ';
        }
    }
    return errorMsg;
}

export function electionSettingsValidation(obj:ElectionSettings, electionState?: ElectionState): string | null {
  if (!obj){
    return "ElectionSettings is null";
  }
  // voter_access is required and restricted to the two canonical values.
  // 'registration' remains a latent value in VoterAcessArray (registerVoterController
  // still handles it for any historical rows) but the create/edit path no longer accepts it.
  if (obj.voter_access !== 'open' && obj.voter_access !== 'closed'){
    return "Invalid Voter Access: must be 'open' or 'closed'";
  }
  if (!obj.voter_authentication){
    return "Invalid Voter Authentication";
  }
  const authError = authenticationValidation(obj.voter_authentication);
  if (authError){
    return authError;
  }
  // invitation is only 'email', and only on closed elections.
  if (obj.invitation !== undefined){
    if (obj.invitation !== 'email'){
      return "Invalid Invitation: only 'email' is supported";
    }
    if (obj.voter_access !== 'closed'){
      return "invitation='email' requires voter_access='closed'";
    }
  }
  // Closed elections must authenticate voters by voter_id.
  if (obj.voter_access === 'closed'){
    if (obj.voter_authentication.voter_id !== true){
      return "Closed elections require voter_authentication.voter_id=true";
    }
    if (obj.voter_authentication.email === true || obj.voter_authentication.ip_address === true){
      return "Closed elections must use voter_id authentication only";
    }
  }
  if (obj.reminders && typeof obj.reminders !== 'boolean'){
    return "Invalid Reminders";
  }
  if (obj.ballot_updates && typeof obj.ballot_updates !== 'boolean') {
    return "Invalid Ballot Updates";
  }
  if (obj.public_results && typeof obj.public_results !== 'boolean'){
    return "Invalid Public Results";
  }
  
  if (obj.time_zone && !(timeZones.includes(obj.time_zone))){
    //return `Invalid Time Zone: ${obj.time_zone}`;
    obj.time_zone = 'America/Los_Angeles'
  }
  if (obj.random_candidate_order && typeof obj.random_candidate_order !== 'boolean'){
    return "Invalid Random Candidate Order";
  }
  if (obj.require_instruction_confirmation && typeof obj.require_instruction_confirmation !== 'boolean'){
    return "Invalid Require Instruction Confirmation";
  }
  if (obj.break_ties_randomly && typeof obj.break_ties_randomly !== 'boolean'){
    return "Invalid Break Ties Randomly";
  }
  if (obj.term_type && !TermTypes.includes(obj.term_type)){
    return "Invalid Term Type";
  }
  // NOTE: temporarily disabling because this broke the ability to set the max rankings from the frontend
  if (obj.max_rankings && (typeof obj.max_rankings !== 'number' || obj.max_rankings < 0)){
   return "Invalid Max Rankings";
  }
  if (obj.draggable_ballot && typeof obj.draggable_ballot !== 'boolean'){
    return "Invalid Draggable Ballot";
  }

  const compatibilityError = settingsCompatiblityValidation(obj, electionState);
  if (compatibilityError) {
    return compatibilityError;
  }
  return null;
}
