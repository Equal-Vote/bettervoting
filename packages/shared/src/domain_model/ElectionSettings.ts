import { timeZones, TimeZone } from "./Util";

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
  if (obj.voter_id && typeof obj.voter_id !== 'boolean'){
    return "Invalid Voter ID";
  }
  if (obj.email && typeof obj.email !== 'boolean'){
    return "Invalid Email";
  }
  if (obj.phone && typeof obj.phone !== 'boolean'){
    return "Invalid Phone";
  }
  if (obj.address && typeof obj.address !== 'boolean'){
    return "Invalid Address";
  }
  if (obj.ip_address && typeof obj.ip_address !== 'boolean'){
    return "Invalid IP Address";
  }
  if (obj.registration_data){
    for (let field of obj.registration_data){
      if (!field.field_name || !field.field_type){
        return "Invalid Registration Field";
      }
    }
  }
  return null;
}
export function electionSettingsValidation(obj:ElectionSettings): string | null {
  if (!obj){
    return "ElectionSettings is null";
  }
  if (obj.voter_access && !VoterAcessArray.includes(obj.voter_access)){
    return "Invalid Voter Access";
  }
  if (!obj.voter_authentication){
    return "Invalid Voter Authentication";
  }
  const authError = authenticationValidation(obj.voter_authentication);
  if (authError){
    return authError;
  }
  if (obj.invitation && !InvitationTypes.includes(obj.invitation)){
    return "Invalid Invitation";
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
  return null;
}

  
