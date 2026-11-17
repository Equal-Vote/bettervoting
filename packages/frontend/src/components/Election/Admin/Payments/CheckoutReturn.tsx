import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Link, Typography } from '@mui/material';
import { itemize } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import useElection from '~/components/ElectionContextProvider';
import { useGetRolls } from '~/hooks/useAPI';
import { useFinalizeAndInvite } from '../useFinalizeAndInvite';
import {
    CHECKOUT_CANCEL_PARAM,
    PAYMENT_RECEIVED_PARAM,
    clearExpectedEntitlements,
    entitlementsCover,
    readExpectedEntitlements,
} from './paymentsUtils';

const POLL_INTERVAL_MS = 2000;
const SLOW_AFTER_MS = 30_000; // then tell the admin they can leave
const GIVE_UP_AFTER_MS = 10 * 60_000; // keep polling behind the slow message, but not forever

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Where the admin lands back from Stripe. The election's state says where the payment came from:
// a draft was paying to Finalize, anything else was paying for an over-limit upload.
export default function CheckoutReturn() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { election, refreshElection } = useElection();
    const { makeRequest: fetchRolls } = useGetRolls(election.election_id);
    const finalizeAndInvite = useFinalizeAndInvite();
    const [phase, setPhase] = useState<'confirming' | 'slow' | 'finalizing'>('confirming');

    const electionId = election.election_id;
    const adminPath = `/${electionId}/admin`;
    const fromFinalize = election.state === 'draft';

    useEffect(() => {
        if (params.get(CHECKOUT_CANCEL_PARAM) === 'cancelled') {
            // Back where they came from, with nothing changed
            clearExpectedEntitlements(electionId);
            navigate(fromFinalize ? `${adminPath}/publish` : `${adminPath}/voters`, { replace: true });
            return;
        }

        const expected = readExpectedEntitlements(electionId);
        if (!expected && !fromFinalize) {
            // An upload's payment can't be confirmed without the saved expectation (e.g. a different tab),
            // so don't claim it landed: say it's pending and let the admin re-submit once it shows.
            setPhase('slow');
            return;
        }

        // Has the webhook's entitlement grant landed?
        const granted = async () => {
            const data = await refreshElection();
            if (!data || !data.entitlements) return false;
            if (expected) return entitlementsCover(data.entitlements, expected);
            // No saved expectation: Finalize waits until the roll is fully covered
            const rolls = await fetchRolls();
            return !!rolls && itemize({ roll_count: rolls.electionRoll.length }, data.entitlements).length === 0;
        };

        let stopped = false;
        const slowTimer = setTimeout(() => { if (!stopped) setPhase('slow'); }, SLOW_AFTER_MS);
        (async () => {
            const giveUpAt = Date.now() + GIVE_UP_AFTER_MS;
            while (!(await granted())) {
                if (stopped || Date.now() > giveUpAt) return; // the slow message stays up
                await sleep(POLL_INTERVAL_MS);
                if (stopped) return;
            }
            if (stopped) return;
            clearTimeout(slowTimer);
            clearExpectedEntitlements(electionId);

            if (!fromFinalize) {
                navigate(`${adminPath}/voters?${PAYMENT_RECEIVED_PARAM}=1`, { replace: true });
                return;
            }
            setPhase('finalizing');
            const outcome = await finalizeAndInvite();
            navigate(outcome === 'invite' ? `${adminPath}/voters` : `${adminPath}/publish`, { replace: true });
        })();

        return () => {
            stopped = true;
            clearTimeout(slowTimer);
        };
    }, []);

    return <Box sx={{ maxWidth: 520, mx: 'auto', my: 6, textAlign: 'center' }}>
        {phase === 'slow'
            ? <Alert severity='info' sx={{ textAlign: 'left' }}>
                Stripe hasn&apos;t confirmed your payment yet. This can take a few minutes for some payment methods.
                You can leave this page: once the payment lands,{' '}
                {fromFinalize
                    ? <><Link component={RouterLink} to={`${adminPath}/publish`}>Publish &amp; Share</Link> will show it as paid and you can finalize from there.</>
                    : <>your higher voter limit will apply and you can re-submit your list on <Link component={RouterLink} to={`${adminPath}/voters`}>Manage Voters</Link>.</>
                }
            </Alert>
            : <>
                <CircularProgress />
                <Typography variant='h6' sx={{ mt: 2 }}>
                    {phase === 'confirming' ? 'Confirming payment…' : 'Payment confirmed. Finalizing…'}
                </Typography>
            </>
        }
    </Box>;
}
