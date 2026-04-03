import { Uid } from "./Uid";
import { emailRegex } from "./Util";
// Election roll contains information about the voter's ID and ballot status to ensure only
// authorized voters submit a single ballot
export interface ElectionRoll {
    voter_id: Uid; //Unique ID of voter who cast ballot
    election_id: Uid; //ID of election ballot is cast in
    email?: string; // Email address of voter
    submitted: boolean; //has ballot been submitted
    ballot_id?:  Uid; //ID of ballot, unsure if this is needed
    ip_hash?: string; //IP Address of voter
    address?: string; // Address of voter
    state: ElectionRollState; //state of election roll
    history?: ElectionRollAction[];// history of changes to election roll
    registration?: any; //Registration data for voter
    precinct?: string; // Precint of voter
    email_data?: {
        inviteResponse?: any,
        reminderResponse?: any,
    };
    create_date:    Date | string; // Date this object was created
    update_date:    Date | string;  // Date this object was last updated
    head:           boolean;// Head version of this object
}

// API response type — extends the domain model with computed fields attached at response time
export interface ElectionRollResponse extends ElectionRoll {
    email_events?: { event_type: string; event_timestamp: string; details?: Record<string, unknown> }[];
}

export interface ElectionRollAction {
    action_type:string;
    actor:Uid;
    timestamp:number;
    email_data?: any;
}
function electionRollActionValidation(obj:ElectionRollAction): string | null {
    if (!obj){
        return "ElectionRollAction is null";
    }
    if (typeof obj.action_type !== 'string'){
        return "Invalid Action Type";
    }
    if (typeof obj.actor !== 'string'){
        return "Invalid Actor";
    }
    if (typeof obj.timestamp !== 'number'){
        return "Invalid Timestamp";
    }
    return null;
}

export enum ElectionRollState {
    approved= 'approved',
    flagged = 'flagged',
    registered = 'registered',
    invalid = 'invalid'
}

export function electionRollValidation(obj:ElectionRoll): string | null {
    if (!obj){
        return "ElectionRoll is null";
    }
    if (typeof obj.voter_id !== 'string'){
        return "Invalid Election Roll ID";
    }
    if (typeof obj.election_id !== 'string'){
        return `(roll) Invalid Election ID ${obj.election_id}`;
    }
    if (obj.email && !emailRegex.test(obj.email)){
        return "Invalid Email";
    }
    if (typeof obj.submitted !== 'boolean'){
        return "Invalid Submitted";
    }
    if (obj.ballot_id && typeof obj.ballot_id !== 'string'){
        return "Invalid Ballot ID";
    }
    if (obj.ip_hash && typeof obj.ip_hash !== 'string'){
        return "Invalid IP Hash";
    }
    if (obj.address && typeof obj.address !== 'string'){
        return "Invalid Address";
    }
    if (!Object.values(ElectionRollState).includes(obj.state)){
        return "Invalid State";
    }
    if (obj.history) {
        for (let action of obj.history){
            const error = electionRollActionValidation(action);
            if (error){
                return error;
            }
        }
    }
    if (obj.registration) {
        //TODO... etc
    }
    if (obj.precinct && typeof obj.precinct !== 'string'){
        return "Invalid Precinct";
    }
    if (obj.email_data) {
        //TODO... etc
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
            return "Invalid Update Date Format";
        }
    }
    if (typeof obj.head !== 'boolean'){
        return "Invalid Head";
    }

    //TODO... etc
    return null;
}
