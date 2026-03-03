import { ElectionRoll } from "./ElectionRoll";
import { ElectionSettings, electionSettingsValidation } from "./ElectionSettings";
import { ElectionState, validElectionStates } from "./ElectionStates";
import { Race } from "./Race";
import { Uid } from "./Uid";
import { raceValidation } from "./Race";
import { checkForDuplicates, emailRegex } from "./Util";

export { ElectionState }

export interface Election {
    election_id:    Uid; // identifier assigned by the system
    title:          string; // one-line election title
    description?:   string; // mark-up text describing the election
    frontend_url:   string; // base URL for the frontend
    start_time?:    Date | string;   // when the election starts 
    end_time?:      Date | string;   // when the election ends
    owner_id:       Uid;  // user_id of owner of election
    audit_ids?:     Uid[];  // user_id of account with audit access
    admin_ids?:     Uid[];  // user_id of account with admin access
    credential_ids?:Uid[];  // user_id of account with credentialling access
    state:          ElectionState; // State of election, In development, finalized, etc
    races:          Race[]; // one or more race definitions
    settings:       ElectionSettings;
    auth_key?:      string;
    claim_key_hash?: string;
    is_public?:     boolean;
    create_date:    Date | string; // Date this object was created
    update_date:    Date | string;  // Date this object was last updated
    head:           boolean;// Head version of this object
    ballot_source:  'live_election' | 'prior_election';
    public_archive_id?: string;
}
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export interface NewElection extends PartialBy<Election,'election_id'|'create_date'|'update_date'|'head'> {}

export function electionValidation(obj:Election): string | null {
  if (!obj){
    return "Election is null";
  }
  const election_id = obj.election_id;
  // Adding toLowerCase as a future proof measure so that custom slugs don't conflict with our other routes
  if (!election_id || typeof election_id !== 'string' || election_id !== election_id.toLowerCase()){
    return `(election) Invalid Election ID ${election_id}`;
  }
  if (typeof obj.title !== 'string'){
    return "Invalid Title";
  }
  if (obj.state !== 'draft' && (obj.title.length < 3 || obj.title.length > 256)) {
    return "invalid Title length";
  }
  if (obj.description && typeof obj.description !== 'string'){
    return "Invalid Description";
  }
  if (obj.frontend_url && typeof obj.frontend_url !== 'string'){
    return "Invalid Frontend URL";
  }
  if (obj.start_time) {
    const date = new Date(obj.start_time);
    if (isNaN(date.getTime())) {
      return "Invalid Start Time Date Format";
    }
  }
  if (obj.end_time) {
    const date = new Date(obj.end_time);
    if (isNaN(date.getTime())) {
      return "Invalid End Time Date Format";
    }
  }
  if (typeof obj.owner_id !== 'string'){
    return "Invalid Owner ID";
  }
  if (obj.audit_ids) {
    if (!Array.isArray(obj.audit_ids)) {
      return "Invalid Audit IDs";
    }
    if (checkForDuplicates(obj.audit_ids)){
      return "Duplicate Audit IDs";
    }
  }
  if (obj.admin_ids) {
    if (!Array.isArray(obj.admin_ids)) {
      return "Invalid Admin IDs";
    }
    if (checkForDuplicates(obj.admin_ids)){
      return "Duplicate Admin IDs";
    }
  }
  if (obj.credential_ids) {
    if (!Array.isArray(obj.credential_ids)) {
      return "Invalid Credential IDs";
    }
    if (checkForDuplicates(obj.credential_ids)){
      return "Duplicate Credential IDs";
    }
  }
  if (obj.state && !validElectionStates.includes(obj.state)){
    return "Invalid Election State";
  }
  if (Array.isArray(obj.races)){
    if(checkForDuplicates(obj.races.map(race => race.race_id))){
      return "Duplicate race IDs";
    }
    if(checkForDuplicates(obj.races.map(race => race.title))){
      return "Duplicate race titles";
    }
    let raceErrors = ''
    obj.races.forEach(race => {
      let raceError = raceValidation(race)
      if (raceError){
        raceErrors += `race_id: ${race.race_id}: ${raceError} `
      }
    });
    if (raceErrors !== ''){
      return raceErrors;
    }
    
  } else {
    return "Race is not an array";
  }
  if (!obj.settings){
    return "Invalid Election Settings";
  } else {
    const settingsError = electionSettingsValidation(obj.settings, obj.state);
    if (settingsError){
      return settingsError;
    }
  }
  if (obj.auth_key && typeof obj.auth_key !== 'string'){
    return "Invalid Auth Key";
  }
  if (obj.claim_key_hash && typeof obj.claim_key_hash !== 'string'){
    return "Invalid Claim Key Hash";
  }
  if (obj.is_public && typeof obj.is_public !== 'boolean'){
    return "Invalid Is Public";
  }
  if (obj.create_date) {
    const date = new Date(obj.create_date);
    if (isNaN(date.getTime())) {
      return "Invalid Create Date Format";
    }
  }
  if (obj.update_date) {
    const date = new Date(Number(obj.update_date));
    if (isNaN(date.getTime())) {
      return `Invalid Update Date Format, it should be milliseconds since epoch: ${obj.update_date}`;
    }
  }
  if (obj.head && typeof obj.head !== 'boolean'){
    return "Invalid Head";
  }

  //TODO... etc
  return null;
}

export function removeHiddenFields(obj: Election): void {
  obj.auth_key = undefined;
}

export function getPrecinctFilteredElection(obj:Election, electionRoll: ElectionRoll|null):Election {
  return {
    ...obj,
    races: (obj.state === 'open')?
      getApprovedRaces(obj, electionRoll?.precinct)
    :
      obj.races
  }
}

// Where should this belong..
export function getApprovedRaces(election:Election, voterPrecinct:string|null|undefined): Race[] {
  return election.races.filter((race:Race) => {
    // If precincts aren't defined, open to all voters
    if(!race.precincts) return true;
    // If race precinct list contains voter's precinct
    if(voterPrecinct && race.precincts.includes(voterPrecinct)) return true;
    // If race has precincts, but voter precinct doesn't match
    return false;
  })
}
