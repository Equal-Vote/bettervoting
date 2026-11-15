import { useFinalizeElection } from '~/hooks/useAPI';
import useConfirm from '~/components/ConfirmationDialogProvider';
import useElection from '~/components/ElectionContextProvider';

// 'failed': useFetch already showed the error (e.g. the 402 when the roll is over the voter limit)
// 'invite': the admin chose to email their voters now, so the caller should open Manage Voters
export type FinalizeOutcome = 'failed' | 'invite' | 'done';

// The finalize call, then the existing prompt offering to email voters when invitations go out now.
// Shared by Publish & Share and the return from Stripe.
export default function useFinalizeAndInvite() {
    const { t, election, refreshElection, enqueueWrite } = useElection();
    const { makeRequest: finalize } = useFinalizeElection(election.election_id);
    const emailConfirm = useConfirm();

    return async (): Promise<FinalizeOutcome> => {
        try {
            const res = await enqueueWrite(expected_update_date => finalize({ expected_update_date }));
            if (!res) return 'failed';
            await refreshElection();
        } catch (err) {
            console.error(err);
            return 'failed';
        }

        const currentTime = new Date();
        if (
            election.settings.voter_access === 'closed' &&
            election.settings.invitation === 'email' &&
            (!election.start_time || currentTime.getTime() > new Date(election.start_time).getTime()) &&
            (!election.end_time || currentTime.getTime() < new Date(election.end_time).getTime())
        ) {
            if (await emailConfirm(t('admin_home.finalize_email_confirm'))) return 'invite';
        }
        return 'done';
    };
}
