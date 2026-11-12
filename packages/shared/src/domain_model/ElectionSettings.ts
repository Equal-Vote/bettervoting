import { timeZones, TimeZone } from "./Util";
import { getVoterAuthenticationMode } from "./VoterAuthenticationMode";
import { BALLOT_SUBMIT_TYPES, BallotSubmitType } from "./Ballot";

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
export const VoterAcessArray = ['open', 'closed', 'registration'] as const;
export type VoterAccess = typeof VoterAcessArray[number];
export const InvitationTypes = ['email', 'address'] as const;
export type InvitationType = typeof InvitationTypes[number];

export const DEFAULT_ALLOWED_SUBMIT_TYPES: BallotSubmitType[] = ['submitted_via_browser', 'submitted_via_discord'];

// The three ways an admin can choose for ballots to come in. They are stored as
// allowed_submit_types (see castVoteController and importBallotsController, which
// enforce it); this is the admin-facing view of that list.
export const BallotChannelsArray = ['online', 'online_and_uploads', 'uploads_only'] as const;
export type BallotChannels = typeof BallotChannelsArray[number];

const CHANNEL_SUBMIT_TYPES: Record<BallotChannels, BallotSubmitType[]> = {
  online: DEFAULT_ALLOWED_SUBMIT_TYPES,
  online_and_uploads: [...DEFAULT_ALLOWED_SUBMIT_TYPES, 'submitted_via_admin'],
  uploads_only: ['submitted_via_admin'],
};

export const acceptsOnlineBallots = (settings: ElectionSettings) =>
  (settings.allowed_submit_types ?? DEFAULT_ALLOWED_SUBMIT_TYPES).includes('submitted_via_browser');
export const acceptsUploadedBallots = (settings: ElectionSettings) =>
  (settings.allowed_submit_types ?? DEFAULT_ALLOWED_SUBMIT_TYPES).includes('submitted_via_admin');

export function getBallotChannels(settings: ElectionSettings): BallotChannels {
  if (!acceptsUploadedBallots(settings)) return 'online';
  return acceptsOnlineBallots(settings) ? 'online_and_uploads' : 'uploads_only';
}

export function setBallotChannels(settings: ElectionSettings, channels: BallotChannels): ElectionSettings {
  return { ...settings, allowed_submit_types: [...CHANNEL_SUBMIT_TYPES[channels]] };
}

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
    allowed_submit_types?: BallotSubmitType[]; // Which submission channels are allowed for this election
    voter_groups?: string[]; // Named voter groups for this election (FF_PRECINCTS)
    voter_groups_enabled?: boolean; // Whether voter groups are active (FF_PRECINCTS)
}
function settingsCompatiblityValidation(settings: ElectionSettings): string {
    let errorMsg = ''
    if (settings.ballot_updates) {
        if (settings.voter_access == 'open') {
            errorMsg += 'Ballot updating is not permitted on open access elections.  ';
        }
        if (settings.invitation != 'email') {
            errorMsg += 'Ballot updating is only permitted on email list elections.  ';
        }
        // An uploaded ballot has no voter behind it to update it, and an uploaded voter has
        // no ballot of their own to edit, so the two never run in the same election.
        if (settings.allowed_submit_types?.includes('submitted_via_admin')) {
            errorMsg += 'Ballot updating cannot be combined with uploaded paper ballots.  ';
        }
    }
    // Without online voting every ballot comes from the admin's upload, so limits on how
    // voters reach the ballot mean nothing, and with a voter list the admin must know the
    // voter ids to write the voter file. electionSettingsValidation has already checked
    // that the mode is canonical before this runs.
    if (!acceptsOnlineBallots(settings)) {
        const mode = getVoterAuthenticationMode(settings);
        if (mode === 'closed_bv_managed_ids') {
            errorMsg += 'Elections without online voting need voter IDs you manage, not an email list.  ';
        } else if (mode !== 'open_open' && mode !== 'closed_admin_managed_ids') {
            errorMsg += 'Elections without online voting cannot limit voters by device, network or login.  ';
        }
    }
    return errorMsg;
}

export function electionSettingsValidation(obj:ElectionSettings): string | null {
  if (!obj){
    return "ElectionSettings is null";
  }
  // VoterAuthenticationMode is the single source of truth for the
  // {voter_access, voter_authentication, invitation} triple.
  try {
    getVoterAuthenticationMode(obj);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
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
  // max_rankings is optional, but when set it must be a positive integer.
  if (obj.max_rankings !== undefined && (typeof obj.max_rankings !== 'number' || !Number.isInteger(obj.max_rankings) || obj.max_rankings < 1)){
   return "Invalid Max Rankings";
  }
  if (obj.draggable_ballot && typeof obj.draggable_ballot !== 'boolean'){
    return "Invalid Draggable Ballot";
  }
  if (obj.allowed_submit_types !== undefined) {
    if (!Array.isArray(obj.allowed_submit_types)) {
      return "Invalid Allowed Submit Types";
    }
    if (obj.allowed_submit_types.length === 0) {
      return "allowed_submit_types must not be empty";
    }
    const validTypes: readonly string[] = BALLOT_SUBMIT_TYPES;
    if (!obj.allowed_submit_types.every((t: string) => validTypes.includes(t))) {
      return "Invalid Allowed Submit Types value";
    }
  }
  if (obj.voter_groups_enabled !== undefined && typeof obj.voter_groups_enabled !== 'boolean'){
    return "Invalid Voter Groups Enabled";
  }
  if (obj.voter_groups !== undefined) {
    if (!Array.isArray(obj.voter_groups)) return "Invalid Voter Groups";
    if (obj.voter_groups.some(g => typeof g !== 'string')) return "Invalid Voter Group Name";
  }

  const compatibilityError = settingsCompatiblityValidation(obj);
  if (compatibilityError) {
    return compatibilityError;
  }
  return null;
}
