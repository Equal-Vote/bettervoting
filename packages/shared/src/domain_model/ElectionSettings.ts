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

export type TermType = 'poll' | 'election';

export interface ElectionSettings {
    voter_access?:         'open' | 'closed' | 'registration';  //   Who is able to vote in election?
    voter_authentication: authentication; // How will voters be authenticated?
    invitation?:          'email' | 'address'; // How will invites be sent? Requires voter_access='closed'
    reminders?:           boolean; //   Send reminders to voters who haven't voted? Requires voter_access='closed'
    ballot_updates?:	    boolean; //		allows voters to update their ballots before election ends
    public_results?:	    boolean; //		allows public to view results
    time_zone?:           string; // Time zone for displaying election start/end times 
    random_candidate_order?: boolean; // Randomize order of candidates on the ballot
    require_instruction_confirmation?: boolean; // Require voter to confirm that they've read the instructions in order to vote
    break_ties_randomly?: boolean; // whether true ties should be broken randomly
    term_type?: TermType; // whether poll or election should be used as the term
}
