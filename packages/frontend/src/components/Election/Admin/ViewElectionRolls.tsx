import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router";
import React from 'react'
import EditElectionRoll from "./EditElectionRoll";
import AddElectionRoll from "./AddElectionRoll";
import PermissionHandler from "../../PermissionHandler";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import EnhancedTable, { HeadKey }  from "./../../EnhancedTable";
import { useClearRolls, useGetRolls, useSendEmails } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import { ElectionRollResponse } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { getVoterAuthenticationMode, setVoterAuthenticationMode, VoterAuthenticationMode } from "@equal-vote/star-vote-shared/domain_model/VoterAuthenticationMode";
import { BallotChannels, BallotChannelsArray, getBallotChannels, setBallotChannels } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import SendEmailDialog from "./SendEmailDialog";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import ElectionAuthForm from "~/components/ElectionForm/Details/ElectionAuthForm";
import useConfirm from "~/components/ConfirmationDialogProvider";
import { AdminPageNavigation } from '../Sidebar';
import HeadToHeadChart from "../../../components/Election/Results/components/HeadToHeadChart";

const ViewElectionRolls = () => {
    const { election, permissions, t, updateElection } = useElection()
    const { data, isPending, makeRequest: fetchRolls } = useGetRolls(election.election_id)
    const sendEmails = useSendEmails(election.election_id)
    const clearRolls = useClearRolls(election.election_id)
    useEffect(() => {
        if(election.settings.voter_access == 'closed')  fetchRolls()
    }, [])
    const [inspectingVoter, setInspectingVoter] = useState(false)
    const [addRollPage, setAddRollPage] = useState(false)
    const [uploadingRolls, setUploadingRolls] = useState(false)
    // refetch on close since an upload may have partially succeeded
    const closeAddRoll = () => { setAddRollPage(false); fetchRolls(); }
    const [editedRoll, setEditedRoll] = useState<ElectionRollResponse|null>(null)
    const flags = useFeatureFlags();
    const navigate = useNavigate();
    const location = useLocation();
    const [dialogOpen, setDialogOpen] = useState(false);

    // Radios are pure projections of the canonical mode. Each click computes the
    // next mode and fires one updateElection — no racing useSyncedState debounces.
    // Legacy non-canonical rows throw; treat them as "open" so the page still
    // renders (ElectionAuthForm degrades to all-unchecked) instead of crashing.
    let mode: VoterAuthenticationMode | null;
    try { mode = getVoterAuthenticationMode(election.settings); } catch { mode = null; }
    const voterAccess: 'open' | 'closed' = mode?.startsWith('closed') ? 'closed' : 'open';
    // BV-managed elections auto-generate voter_id and redact it from the admin view,
    // matching voters by email instead. Admin-managed elections still let the admin
    // collect emails per-voter and send email blasts — they just aren't required to.
    const redactsVoterIds = mode === 'closed_bv_managed_ids';
    const canSendEmailBlast = voterAccess === 'closed';
    const writeMode = (m: Parameters<typeof setVoterAuthenticationMode>[1]) =>
        updateElection(e => { e.settings = setVoterAuthenticationMode(e.settings, m); });

    const confirm = useConfirm();

    const onOpen = (voter) => {
        setInspectingVoter(true)
        setEditedRoll(voter?.raw ?? null)
        navigate(`${location.pathname}?editing=true`, { replace: false });
    }

    const onSendEmails = ({
        subject,
        body,
        target,
    } : {
        subject: string,
        body: string,
        target: 'all' | 'has_voted' | 'has_not_voted' | 'single'
    }) => {
        setDialogOpen(false);
        sendEmails.makeRequest({
            target: target,
            email: { subject, body },
        })
    }

    const onUpdate = async () => {
        const results = await fetchRolls()
        if (!results) return
        setEditedRoll(currentRoll => {
            if (!currentRoll) return null;
            // When voter IDs are redacted (email list elections), always match by email
            const voterIdsAreRedacted = election.settings.invitation === 'email';
            const useEmail = voterIdsAreRedacted || !election.settings.voter_authentication?.voter_id
            const identifier = useEmail ? currentRoll.email : currentRoll.voter_id;
            if (!identifier) return null;
            return results.electionRoll.find(roll =>
                useEmail ? roll.email === identifier : roll.voter_id === identifier
            ) ?? null;
        })
    }

    const headKeys:HeadKey[] = ['email', 'has_voted'];

    if (flags.isSet('PRECINCTS')) headKeys.push('precinct');

    if(!redactsVoterIds) headKeys.unshift('voter_id')

    const electionRollData = React.useMemo(
        () => data?.electionRoll ? [...data.electionRoll] : [],
        [data]
    );

    // Adding the first voter locks the voter auth radios above. While the election is still a
    // draft that lock is undoable: clearing the roll empties it and re-enables the radios.
    const canClearRolls = election.state === 'draft' && electionRollData.length > 0;

    const onClearRolls = async () => {
        if (!await confirm(t('admin_home.clear_voter_roll_confirm', { voter_count: electionRollData.length }))) return;
        if (!await clearRolls.makeRequest()) return;
        await fetchRolls();
    }

    // How ballots come in. Without online voting the voter options below narrow: there is no
    // one-vote-per limit to set, and a voter list must use ids the admin manages, since the
    // admin writes the voter file (settingsCompatiblityValidation in shared enforces both).
    const channels = getBallotChannels(election.settings);
    const uploadsOnly = channels === 'uploads_only';
    const isDraft = election.state === 'draft';
    const hasVoters = electionRollData.length > 0;
    const channelBlocker = (c: BallotChannels): string | null => {
        if (c === channels || c === 'online') return null;
        if (election.settings.ballot_updates) return t('admin_home.ballot_channels.with_ballot_updates');
        if (c === 'uploads_only' && mode === 'closed_bv_managed_ids' && hasVoters) return t('admin_home.ballot_channels.clear_email_list_first');
        return null;
    };
    const writeChannels = (c: BallotChannels) => updateElection(e => {
        let next = setBallotChannels(e.settings, c);
        if (c === 'uploads_only') {
            let current: VoterAuthenticationMode | null;
            try { current = getVoterAuthenticationMode(next); } catch { current = null; }
            if (current === 'closed_bv_managed_ids') next = setVoterAuthenticationMode(next, 'closed_admin_managed_ids');
            else if (current !== 'closed_admin_managed_ids') next = setVoterAuthenticationMode(next, 'open_open');
        }
        e.settings = next;
    });
    const channelNote = BallotChannelsArray.map(channelBlocker).find(Boolean);

    const submittedCount = electionRollData.filter(voter => voter.submitted === true).length;
    return (
        <>
            <Box>
                <Typography>
                    {t('admin_home.ballot_channels.question')}
                </Typography>
                <RadioGroup row>
                    {BallotChannelsArray.map((c) =>
                        <FormControlLabel
                            key={c}
                            value={c}
                            control={<Radio/>}
                            disabled={!isDraft || !!channelBlocker(c)}
                            label={t(`admin_home.ballot_channels.${c}`)}
                            onClick={() => {
                                if (!isDraft || channelBlocker(c) || c === channels) return;
                                writeChannels(c);
                            }}
                            checked={channels === c}
                        />
                    )}
                </RadioGroup>
                {isDraft && channelNote && <Typography variant='body2' color='text.secondary'>{channelNote}</Typography>}
            </Box>
            <Box>
                <Typography>
                    {t('wizard.restricted_question')}
                </Typography>

                <RadioGroup row>
                    {[true, false].map((restricted) =>
                        <FormControlLabel
                            key={`${restricted}`}
                            value={restricted}
                            control={<Radio/>}
                            disabled={election.state !== 'draft' || electionRollData.length > 0}
                            label={t(`keyword.${restricted ? 'yes' : 'no'}`)}
                            onClick={async () => {
                                if(election.state !== 'draft' || electionRollData.length > 0) return; // not sure why disabled still allows me to do onclick

                                writeMode(restricted
                                    ? (uploadsOnly ? 'closed_admin_managed_ids' : 'closed_bv_managed_ids')
                                    : (uploadsOnly ? 'open_open' : 'open_unique_cookie'));
                            }}
                            checked={voterAccess === (restricted ? 'closed' : 'open')}
                        />
                    )}
                </RadioGroup>
            </Box>
            {voterAccess == 'closed' && uploadsOnly && <Typography variant='body2' color='text.secondary'>
                {t('admin_home.ballot_channels.uploads_only_ids')}
            </Typography>}
            {voterAccess == 'closed' && !uploadsOnly && <Box>
                <Typography>
                    How would you like to identify your voters?
                </Typography>

                <RadioGroup row>
                    {[true, false].map((email) =>
                        <FormControlLabel
                            key={`${email}`}
                            value={email}
                            control={<Radio />}
                            disabled={election.state !== 'draft' || electionRollData.length > 0}
                            label={t(`wizard.${email ? 'email_list' : 'id_list'}_title_with_tip`)}
                            onClick={async () => {
                                if(election.state !== 'draft' || electionRollData.length > 0) return; // not sure why disabled still allows me to do onclick

                                writeMode(email ? 'closed_bv_managed_ids' : 'closed_admin_managed_ids');
                            }}
                            checked={redactsVoterIds === email}
                        />
                    )}
                </RadioGroup>
            </Box>}

            <HeadToHeadChart
                leftOnly={true}
                leftName={'Voted'}
                rightName={''}
                leftVotes={submittedCount}
                rightVotes={0}
                total={electionRollData.length}
                equalContent={{
                    title: 'Election Votes',
                    description: 'Percentage of voters who have cast a vote'
                }}
            />

            {voterAccess == 'open' && (uploadsOnly
                ? <Typography variant='body2' color='text.secondary'>{t('admin_home.ballot_channels.uploads_only_no_limit')}</Typography>
                : <ElectionAuthForm />)}
            {voterAccess == 'closed' && <>
                {!inspectingVoter && !addRollPage &&
                    <Box>
                        {voterAccess === 'closed' &&
                            <PermissionHandler permissions={permissions} requiredPermission={'canAddToElectionRoll'}>
                                <SecondaryButton onClick={async () => {
                                    if(electionRollData.length > 0 || await confirm(t('admin_home.add_first_voter_roll_confirm'))){
                                        setAddRollPage(true)
                                    }
                                }} > Add Voters </SecondaryButton>
                            </PermissionHandler>
                        }
                        {canSendEmailBlast &&
                            <SecondaryButton onClick={() => setDialogOpen(true)} sx={{ml: 2}}>Draft Email Blast</SecondaryButton>
                        }
                        {canClearRolls &&
                            <PermissionHandler permissions={permissions} requiredPermission={'canAddToElectionRoll'}>
                                <SecondaryButton onClick={onClearRolls} disabled={clearRolls.isPending} sx={{ml: 2}}>
                                    {t('admin_home.clear_voter_roll_button')}
                                </SecondaryButton>
                            </PermissionHandler>
                        }
                        <EnhancedTable
                            headKeys={headKeys}
                            data={electionRollData}
                            isPending={isPending && data?.electionRoll !== undefined}
                            pendingMessage='Loading Voters...'
                            defaultSortBy={headKeys[0]}
                            title="Voters"
                            handleOnClick={(voter) => onOpen(voter)}
                            emptyContent={<p>This election doesn&apos;t have any voters yet</p>}
                        />
                    </Box>
                }
                <Dialog
                    open={inspectingVoter && !!editedRoll}
                    onClose={() => setInspectingVoter(false)}
                    fullWidth
                    maxWidth='md'
                >
                    <DialogTitle sx={{m: 0}}>Inspecting Voter</DialogTitle>
                    <DialogContent>
                        <EditElectionRoll roll={editedRoll} fetchRolls={onUpdate}/>
                    </DialogContent>
                    <DialogActions>
                        <PrimaryButton onClick={() => setInspectingVoter(false)}>
                            {t('keyword.close')}
                        </PrimaryButton>
                    </DialogActions>
                </Dialog>
                <Dialog
                    open={addRollPage}
                    onClose={() => { if (!uploadingRolls) closeAddRoll() }}
                    fullWidth
                    maxWidth='md'
                >
                    <DialogTitle sx={{m: 0}}>Adding Voters</DialogTitle>
                    <DialogContent>
                        <AddElectionRoll onClose={closeAddRoll} onUploadingChange={setUploadingRolls}/>
                    </DialogContent>
                    <DialogActions>
                        <PrimaryButton disabled={uploadingRolls} onClick={closeAddRoll}>
                            {t('keyword.close')}
                        </PrimaryButton>
                    </DialogActions>
                </Dialog>

                <SendEmailDialog electionRoll={data?.electionRoll?.filter(roll => roll.email)} open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={onSendEmails}/>
            </>}
            <AdminPageNavigation />
        </>
    )
}

export default ViewElectionRolls
