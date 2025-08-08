import { Election, NewElection } from "@equal-vote/star-vote-shared/domain_model/Election";
import { VoterAuth } from '@equal-vote/star-vote-shared/domain_model/VoterAuth';
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import useFetch from "./useFetch";
import { VotingMethod } from "@equal-vote/star-vote-shared/domain_model/Race";
import { ElectionResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { Ballot, NewBallot, AnonymizedBallot, NewBallotWithVoterID, BallotSubmitStatus } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { email_request_data } from "@equal-vote/star-vote-backend/src/Controllers/Election/sendEmailController"

export const useGetElection = (electionID: string | undefined) => {
    return useFetch<undefined, {
        election: Election,
        precinctFilteredElection: Election,
        voterAuth: VoterAuth
    }>(`/API/Election/${electionID}`, 'get')
}

export const useElectionExists = (electionID: string | undefined) => {
    return useFetch<undefined, { exists: boolean | string}>(`/API/Election/${electionID}/exists`, 'get')
}

export const useGetElections = () => {
    return useFetch<undefined, {
        elections_as_official: Election[] | null,
        elections_as_unsubmitted_voter: Election[] | null,
        elections_as_submitted_voter: Election[] | null,
        open_elections: Election[] | null,
        public_archive_elections: Election[] | null
    }>('/API/Elections', 'get')
}

export const usePostElection = () => {
    return useFetch<{ Election: NewElection }, { election: Election }>('/API/Elections', 'post')
}

export const useGetGlobalElectionStats = () => {
    return useFetch<undefined, { elections: number, votes: number }>('/API/GlobalElectionStats', 'get')
}

export const useEditElection = (election_id: string | undefined) => {
    return useFetch<{ Election: Election }, { election: Election }>(`/API/Election/${election_id}/edit`, 'post')
}

export const useSendInvites = (electionID: string | undefined) => {
    return useFetch<undefined, object>(
        `/API/Election/${electionID}/sendInvites`,
        'post',
        'Email Invites Sent!',
    )
}

export const useSendEmails = (electionID: string | undefined) => {
    return useFetch<email_request_data, object>(
        `/API/Election/${electionID}/sendEmails`,
        'post',
        'Emails Sent!',
    )
}

export const useSendInvite = (election_id: string, voter_id: string | undefined) => {
    return useFetch<undefined, object>(
        `/API/Election/${election_id}/sendInvite/${voter_id}`,
        'post',
        'Email Invitation Sent!',
    )
}

export const useGetRolls = (electionID: string | undefined) => {
    return useFetch<undefined, { election: Election, electionRoll: ElectionRoll[] }>(`/API/Election/${electionID}/rolls`, 'get')
}

export const usePutElectionRoles = (election_id: string) => {
    return useFetch<{ admin_ids: string[], audit_ids: string[], credential_ids: string[] }, object>(
        `/API/Election/${election_id}/roles/`, 
        'put',
        'Election Roles Saved!',)
}

export const usePostRolls = (election_id: string) => {
    return useFetch<{ electionRoll: ElectionRoll[] }, object>(`/API/Election/${election_id}/rolls/`, 'post')
}

export const useSetPublicResults = (election_id: string) => {
    return useFetch<{ public_results: boolean }, { election: Election }>(`/API/Election/${election_id}/setPublicResults`, 'post')
}

export const useDeleteAllBallots = (election_id: string) => {
    return useFetch<{ public_results: boolean }, { election: Election }>(`/API/Election/${election_id}/ballots`, 'delete')
}

export const useFinalizeElection = (election_id: string) => {
    return useFetch<undefined, { election: Election }>(`/API/Election/${election_id}/finalize`, 'post')
}

export const useArchiveEleciton = (election_id: string) => {
    return useFetch<undefined, { election: Election }>(`/API/Election/${election_id}/archive`, 'post')
}

export const useSetOpenState = (election_id: string) => {
    return useFetch<{ closing: boolean }, { election: Election }>(`/API/Election/${election_id}/setOpenState`, 'post')
}

export const useApproveRoll = (election_id: string) => {
    return useFetch<{ electionRollEntry: ElectionRoll }, object>(`/API/Election/${election_id}/rolls/approve`, 'post')
}

export const useFlagRoll = (election_id: string) => {
    return useFetch<{ electionRollEntry: ElectionRoll }, object>(`/API/Election/${election_id}/rolls/flag`, 'post')
}

export const useUnflagRoll = (election_id: string) => {
    return useFetch<{ electionRollEntry: ElectionRoll }, object>(`/API/Election/${election_id}/rolls/unflag`, 'post')
}

export const useInvalidateRoll = (election_id: string) => {
    return useFetch<{ electionRollEntry: ElectionRoll }, object>(`/API/Election/${election_id}/rolls/invalidate`, 'post')
}

export const useGetBallot = (election_id: string, ballot_id: string | undefined) => {
    return useFetch<undefined, { ballot: Ballot }>(`/API/Election/${election_id}/ballot/${ballot_id}`, 'get')
}

export const useGetBallots = (election_id: string | undefined) => {
    return useFetch<undefined, { election: Election, ballots: Ballot[] }>(`/API/Election/${election_id}/ballots`, 'get')
}

export const useGetAnonymizedBallots = (election_id: string | undefined) => {
    return useFetch<undefined, { ballots: AnonymizedBallot[] }>(`/API/Election/${election_id}/anonymizedBallots`, 'get')
}

export const useGetResults = (election_id: string | undefined) => {
    return useFetch<undefined, {election: Election, results: ElectionResults[]}>(`/API/ElectionResult/${election_id}`, 'get')
}

export const usePostBallot = (election_id: string | undefined) => {
    return useFetch<{ ballot: NewBallot, receiptEmail?: string }, {ballot: Ballot}>(`/API/Election/${election_id}/vote`, 'post')
}

export const useUploadBallots = (election_id: string | undefined) => {
    return useFetch<{ ballots: NewBallotWithVoterID[] }, {responses: BallotSubmitStatus[]}>(`/API/Election/${election_id}/uploadBallots`, 'post')
}

export const useGetSandboxResults = () => {
    return useFetch<{
        cvr: number[][],
        candidates: string[],
        num_winners: number,
        votingMethod: VotingMethod}, { results: ElectionResults, nWinners: number, candidates: string[]}>
        (`/API/Sandbox`, 'post')
}
