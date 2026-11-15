import Grid from "@mui/material/Grid";
import { Box } from "@mui/material";
import { Typography } from "@mui/material";
import { PrimaryButton } from "../../styles";
import { useLocation, useNavigate } from 'react-router-dom';
import ShareButton from "../ShareButton";
import { useEffect, useState } from "react";
import { useGetRolls, useSetOpenState } from "../../../hooks/useAPI";
import { SwitchSetting } from '../../util';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';
import useAuthSession from '../../AuthSessionContextProvider';
import { AdminPageNavigation } from '../Sidebar';
import useOptimisticToggle from '~/hooks/useOptimisticToggle';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import { itemize } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import useFinalizeAndInvite from './useFinalizeAndInvite';
import useCheckout from './Payments/useCheckout';
import { FINALIZE_COST_ID, FinalizeCostSection, FinalizeDialog } from './Payments/FinalizeCost';

export default function PublishAndShare() {
    const authSession = useAuthSession()
    const { t, election, entitlements, refreshElection: fetchElection, permissions, enqueueWrite } = useElection()
    const flags = useFeatureFlags()
    const paymentsEnabled = flags.isSet('PAYMENTS')

    const finalizeAndInvite = useFinalizeAndInvite()
    const { startCheckout, isPending: checkoutPending } = useCheckout()
    const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)

    // Finalize is where the voter limit is enforced (validateEntitlements), so price it (or warn) before the 402
    const checkVoterLimit = election.state === 'draft' && election.settings.voter_access === 'closed' && entitlements !== undefined
    const { data: rollData, makeRequest: fetchRolls } = useGetRolls(election.election_id)
    useEffect(() => {
        if (checkVoterLimit) fetchRolls()
    }, [checkVoterLimit])
    const rollCount = rollData?.electionRoll.length
    const overVoterLimit = checkVoterLimit && rollCount !== undefined && rollCount > entitlements.voter_limit
    // What finalizing costs: the cost section and the Finalize dialog both show this
    const showCost = paymentsEnabled && checkVoterLimit && rollCount !== undefined
    const lineItems = showCost ? itemize({ roll_count: rollCount }, entitlements) : []

    // Publish & Share#finalize-cost (linked from Manage Voters and Add Voters) scrolls to the cost once it's rendered
    const location = useLocation()
    useEffect(() => {
        if (showCost && location.hash === `#${FINALIZE_COST_ID}`) {
            document.getElementById(FINALIZE_COST_ID)?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [location.hash, showCost])

    const { makeRequest: setOpenState } = useSetOpenState(election.election_id)

    const navigate = useNavigate()

    const confirm = useConfirm()

    const hasPermission = (requiredPermission: string) => {
        return (permissions && permissions.includes(requiredPermission))
    }

    if (!hasPermission('canEditElectionState')) return <Box sx={{ width: "100%" }}>
        <Typography align='center' variant="h5" sx={{ color: 'error.main', pl: 2 }}>
            {t('admin_home.admin_access_denied')}
        </Typography>
    </Box>

    const finalizeAndNavigate = async () => {
        if (await finalizeAndInvite() === 'invite') navigate(`/${election.election_id}/admin/voters`)
    }

    const finalizeElection = async () => {
        if (paymentsEnabled) {
            setFinalizeDialogOpen(true)
            return
        }
        const confirmed = await confirm(t('admin_home.finalize_confirm'));
        if (!confirmed) return;
        await finalizeAndNavigate()
    }

    // The Finalize dialog's confirm: pay first when something is owed, otherwise finalize as usual.
    // If the roll grew since it was priced, the finalize call's 402 backstop still applies.
    const onFinalizeConfirmed = async () => {
        if (lineItems.length > 0) {
            await startCheckout(lineItems, entitlements)
            return
        }
        setFinalizeDialogOpen(false)
        await finalizeAndNavigate()
    }

    const FinalizeSection = () => <Box sx={{maxWidth: 800}}>
        <Grid size={12} sx={{ p: 1, pt: 3, pb: 0 }}>
            <Typography align='center' variant="body1" sx={{ pl: 2 }}>
                {t('admin_home.finalize_description')}
            </Typography>
            {!hasPermission('canEditElectionState') &&
                <Typography align='center' variant="body1" sx={{ color: 'error.main', pl: 2 }}>
                    {t('admin_home.permissions_error')}
                </Typography>
            }
        </Grid>
        {showCost && <FinalizeCostSection lineItems={lineItems} rollCount={rollCount} entitlements={entitlements} />}
        {!paymentsEnabled && overVoterLimit &&
            // Stop-gap for when FF_PAYMENTS is off: the itemized cost section replaces it
            <Grid size={12} sx={{ p: 1, pt: 2, pb: 0 }}>
                <Typography align='center' variant="body1" sx={{ color: 'error.main', pl: 2 }}>
                    Your voter count exceeds the free tier limit, please reach out to elections@equal.vote for an override.
                </Typography>
            </Grid>
        }
        <Grid size={12} sx={{ p: 1, pt: 0, display: 'flex', alignItems: 'center' }}>
            <PrimaryButton
                disabled={election.title.length === 0 || election.races.length === 0 || !hasPermission('canEditElectionState') || !authSession.isLoggedIn()}
                fullWidth
                onClick={() => finalizeElection()}
                sx={{mt: 2}}
            >
                <Typography align='center' variant="h4" sx={{ fontWeight: 'bold' }}>
                   {t('admin_home.finalize_button')}
                </Typography>
            </PrimaryButton>
        </Grid>
        {!authSession.isLoggedIn() && 
        <Grid size={12} sx={{ p: 1, pt: 0, display: 'flex', alignItems: 'center' }}>
            <Typography align='center' variant="body1" sx={{ pl: 2, m:'auto' }}>
                {/* I'm setting an href here and an onClick, so that the url styling will work like other a-href components*/}
                <a href='#free-account-text' id='free-account-text' onClick={() => {
                    sessionStorage.setItem('election_to_claim', election.election_id)
                    authSession.openLogin()
                }}>
                    Create a free account
                </a>
                &nbsp;to finalize your election!
            </Typography>
        </Grid>}
    </Box>

    const [isOpen, setIsOpen] = useOptimisticToggle(election.state === 'open', async (toggled) => {
        const res = await enqueueWrite(expected_update_date => setOpenState({ open: toggled, expected_update_date }));
        // Same as setPublicResults in ElectionSettings: this write bypasses
        // updateElection, so nothing folds the new state into the context.
        // Stale election.state also mislabels the sidebar (Preview vs Live Ballot).
        if (res) await fetchElection();
        return !!res;
    });
    
    const hasScheduledTimes = !!(election.start_time || election.end_time);
    const canEditState = permissions?.includes('canEditElectionState') ?? false;

    return <>
        {(election.state === 'finalized' || election.state === 'open' || election.state === 'closed') && (
            <Box sx={{ m: 0, my: 0, p: 1 }}>
                <SwitchSetting
                    label={t('admin_home.election_is_open')}
                    toggled={isOpen}
                    onToggle={setIsOpen}
                    disabled={hasScheduledTimes || !canEditState}
                    disabledMessage={hasScheduledTimes ? "Open/close is managed automatically based on start and end time" : undefined}
                />
                {election.state === 'closed' && election.end_time && (
                    <Typography variant="body2">{t('admin_home.header_ended_time', {datetime: election.end_time})}</Typography>
                )}
                {election.state === 'open' && election.end_time && (
                    <Typography variant="body2">{t('admin_home.header_end_time', {datetime: election.end_time})}</Typography>
                )}
                {election.state === 'finalized' && election.start_time && (
                    <Typography variant="body2">{t('admin_home.header_start_time', {datetime: election.start_time})}</Typography>
                )}
            </Box>
        )}

        {(election.state !== 'draft' && election.state !== 'finalized') && 
            <Box sx={{width: '100%', maxWidth: 300}}>
                <ShareButton url={`${window.location.origin}/${election.election_id}`} />
            </Box>
        }
        {election.state === 'draft' && <FinalizeSection /> }
        <FinalizeDialog
            open={finalizeDialogOpen}
            lineItems={lineItems}
            pending={checkoutPending}
            onCancel={() => setFinalizeDialogOpen(false)}
            onConfirm={onFinalizeConfirmed}
        />
        <AdminPageNavigation />
    </>
}