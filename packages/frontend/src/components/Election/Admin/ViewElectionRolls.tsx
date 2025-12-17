import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router";
import React from 'react'
import EditElectionRoll from "./EditElectionRoll";
import AddElectionRoll from "./AddElectionRoll";
import PermissionHandler from "../../PermissionHandler";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import EnhancedTable, { HeadKey }  from "./../../EnhancedTable";
import { useGetRolls, useSendEmails } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import { ElectionRollResponse } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import SendEmailDialog from "./SendEmailDialog";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import ElectionAuthForm from "~/components/ElectionForm/Details/ElectionAuthForm";
import useConfirm from "~/components/ConfirmationDialogProvider";

const ViewElectionRolls = () => {
    const { election, permissions, t, updateElection, refreshElection } = useElection()
    const { data, isPending, makeRequest: fetchRolls } = useGetRolls(election.election_id)
    const sendEmails = useSendEmails(election.election_id)
    useEffect(() => {
        if(election.settings.voter_access == 'closed')  fetchRolls()
    }, [])
    const [inspectingVoter, setInspectingVoter] = useState(false)
    const [addRollPage, setAddRollPage] = useState(false)
    const [editedRoll, setEditedRoll] = useState<ElectionRollResponse|null>(null)
    const flags = useFeatureFlags();
    const navigate = useNavigate();
    const location = useLocation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [voterAccess, setVoterAccess] = useState(election.settings.voter_access);
    const [usesEmail, setUsesEmail] = useState(election.settings.invitation === 'email');
    const confirm = useConfirm();

    const usesVoterIdAuthentication = !!election.settings.voter_authentication?.voter_id;

    const onOpen = (voter) => {
        setInspectingVoter(true)
        setEditedRoll(voter?.raw ?? null)
        navigate(`${location.pathname}?editing=true`, { replace: false });
    }

    useEffect(() => {
        setVoterAccess(election.settings.voter_access);
        if(usesEmail != undefined){ // the radio button is allowed to be out of sync with the database if it's set to undefined
            setUsesEmail(election.settings.invitation === 'email');
        }
    }, [election])

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
            const useEmail = voterIdsAreRedacted || !usesVoterIdAuthentication;
            const identifier = useEmail ? currentRoll.email : currentRoll.voter_id;
            if (!identifier) return null;
            return results.electionRoll.find(roll =>
                useEmail ? roll.email === identifier : roll.voter_id === identifier
            ) ?? null;
        })
    }

    const headKeys:HeadKey[] = ['email', 'has_voted'];

    if (flags.isSet('PRECINCTS')) headKeys.push('precinct');

    if(!usesEmail) headKeys.unshift('voter_id')

    const electionRollData = React.useMemo(
        () => data?.electionRoll ? [...data.electionRoll] : [],
        [data]
    );

    return (
        <>
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
                            disabled={electionRollData.length > 0}
                            label={t(`keyword.${restricted ? 'yes' : 'no'}`)}
                            onClick={async () => {
                                let newAccess: 'closed' | 'open' = restricted ? 'closed' : 'open';

                                if(electionRollData.length > 0) return; // not sure why disabled still allows me to do onclick

                                // detect no-op
                                if(newAccess === election.settings.voter_access) return;

                                // update settings
                                setVoterAccess(newAccess);
                                setUsesEmail(undefined);
                                await updateElection((e) => e.settings.voter_access = newAccess);
                                await refreshElection();
                            }}
                            checked={voterAccess === (restricted ? 'closed' : 'open')}
                        />
                    )}
                </RadioGroup>
            </Box>
            {voterAccess == 'closed' && <Box>
                <Typography>
                    How would you like to identify your voters?
                </Typography>

                <RadioGroup row>
                    {[true, false].map((email) =>
                        <FormControlLabel
                            key={`${email}`}
                            value={email}
                            control={<Radio />}
                            disabled={electionRollData.length > 0}
                            label={t(`wizard.${email ? 'email_list' : 'id_list'}_title_with_tip`)}
                            onClick={async () => {
                                if(electionRollData.length > 0) return; // not sure why disabled still allows me to do onclick

                                // detect no-op
                                if(usesEmail !== undefined && email == (election.settings.invitation === 'email')) return;

                                // update settings
                                setUsesEmail(email);
                                await updateElection((e) => e.settings.invitation = email ? 'email' : undefined);
                                await refreshElection();
                            }}
                            checked={usesEmail === email}
                        />
                    )}
                </RadioGroup>
            </Box>}
            {voterAccess == 'open' && <ElectionAuthForm />}
            {voterAccess == 'closed' && usesEmail !== undefined && <>
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
                        {usesEmail &&
                            <SecondaryButton onClick={() => setDialogOpen(true)} sx={{ml: 2}}>Draft Email Blast </SecondaryButton>
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
                    onClose={() => setAddRollPage(false)}
                    fullWidth
                    maxWidth='md'
                >
                    <DialogTitle sx={{m: 0}}>Adding Voters</DialogTitle>
                    <DialogContent>
                        <AddElectionRoll onClose={() => setAddRollPage(false)}/>
                    </DialogContent>
                    <DialogActions>
                        <PrimaryButton onClick={() => setAddRollPage(false)}>
                            {t('keyword.close')}
                        </PrimaryButton>
                    </DialogActions>
                </Dialog>

                <SendEmailDialog electionRoll={data?.electionRoll} open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={onSendEmails}/>
            </>}
        </>
    )
}

export default ViewElectionRolls
