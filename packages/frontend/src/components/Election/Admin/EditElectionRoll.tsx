import { useState } from "react"
import Grid from "@mui/material/Grid";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PermissionHandler from "../../PermissionHandler";
import { useApproveRoll, useFlagRoll, useInvalidateRoll, useRevealVoterId, useSendEmails, useUnflagRoll } from "../../../hooks/useAPI";
import { getLocalTimeZoneShort } from "../../util";
import useElection from "../../ElectionContextProvider";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import SendEmailDialog from "./SendEmailDialog";
import useSnackbar from "~/components/SnackbarContext";
import { PrimaryButton, SecondaryButton } from "~/components/styles";

type Props = {
    roll: ElectionRoll,
    onClose: () => void,
    fetchRolls: () => Promise<void>,
  }
const EditElectionRoll = ({ roll, onClose, fetchRolls }:Props) => {
    const { t, election, permissions } = useElection()
    const flags = useFeatureFlags();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [revealedVoterId, setRevealedVoterId] = useState<string | null>(null);

    const approve = useApproveRoll(election.election_id)
    const flag = useFlagRoll(election.election_id)
    const unflag = useUnflagRoll(election.election_id)
    const invalidate = useInvalidateRoll(election.election_id)
    const sendEmails = useSendEmails(election.election_id)
    const revealVoterId = useRevealVoterId(election.election_id)
    const { setSnack } = useSnackbar();

    // Reveal flow is required when voter IDs are redacted (email list elections)
    const requiresRevealFlow = election.settings.invitation === 'email';

    const onApprove = async () => {
        if (!await approve.makeRequest({ electionRollEntry: roll })) { return }
        await fetchRolls()
    }
    const onFlag = async () => {
        if (!await flag.makeRequest({ electionRollEntry: roll })) { return }
        await fetchRolls()
    }
    const onUnflag = async () => {
        if (!await unflag.makeRequest({ electionRollEntry: roll })) { return }
        await fetchRolls()
    }
    const onInvalidate = async () => {
        if (!await invalidate.makeRequest({ electionRollEntry: roll })) { return }
        await fetchRolls()
    }
    const onSendEmail = async ({
        subject,
        body,
        target,
    } : {
        subject: string,
        body: string,
        target: 'all' | 'has_voted' | 'has_not_voted' | 'single' | 'test'
        testEmails: string[],
    }) => {
        setDialogOpen(false);

        const payload: {
            target: 'all' | 'has_voted' | 'has_not_voted' | 'single' | 'test',
            email: { subject: string, body: string },
            voter_id?: string,
            recipient_email?: string,
        } = {
            target,
            email: { subject, body },
        };

        if (roll.voter_id) {
            payload.voter_id = roll.voter_id;
        } else if (requiresRevealFlow && roll.email) {
            payload.recipient_email = roll.email;
        } else {
            setSnack({
                message: 'Voter ID or email address not available for this voter',
                severity: 'error',
                open: true,
                autoHideDuration: 6000,
            });
            return;
        }

        if (!await sendEmails.makeRequest(payload)) return;

        await fetchRolls()
    }

    const onCopyVotingUrl = async () => {
        if (requiresRevealFlow) {
            setConfirmDialogOpen(true);
            return;
        }

        if (!roll.voter_id) {
            setSnack({
                message: 'Voter ID not available for this voter',
                severity: 'error',
                open: true,
                autoHideDuration: 6000,
            });
            return;
        }

        navigator.clipboard.writeText(`${window.location.origin}/${election.election_id}/id/${roll.voter_id}`);
        setSnack({
            message: 'Unique URL Copied!',
            severity: 'success',
            open: true,
            autoHideDuration: 6000,
        });
    }

    const handleConfirmReveal = async () => {
        setConfirmDialogOpen(false);
        const result = await revealVoterId.makeRequest({ email: roll.email });
        if (result && result.voter_id) {
            setRevealedVoterId(result.voter_id);
            navigator.clipboard.writeText(window.location.origin+'/'+election.election_id+'/id/'+result.voter_id);
            setSnack({
                message: 'Voter ID revealed and URL copied. Action has been logged.',
                severity: 'warning',
                open: true,
                autoHideDuration: 8000,
            });
            await fetchRolls(); // Refresh to show the audit log entry
        }
    }

    return (
        <Container>
            <Grid container direction="column" >
                {(approve.isPending || flag.isPending || unflag.isPending || invalidate.isPending || revealVoterId.isPending) &&
                    <Grid item sm={12}>
                        <Typography align='center' gutterBottom variant="h6" component="h6">
                            Sending Request...
                        </Typography>
                    </Grid>
                }
                {roll.email &&
                    <Grid item sm={12}>
                        <Typography align='left' gutterBottom variant="h6" component="h6">
                            {`Email Address: ${roll.email}`}
                        </Typography>
                    </Grid>
                }
                <Grid item sm={12}>
                    <Typography align='left' gutterBottom variant="h6" component="h6">
                        {`Has Voted: ${roll.submitted.toString()}`}
                    </Typography>
                </Grid>
                <Grid item sm={12}>
                    <Typography align='left' gutterBottom variant="h6" component="h6">
                        {`State: ${roll.state}`}
                    </Typography>
                </Grid>

                {election.settings.invitation === 'email' && roll.email &&
                    <>
                        {roll && !(roll.email_data && roll.email_data.inviteResponse) &&
                            <Grid item sm={12}>
                                <Typography align='left' gutterBottom variant="h6" component="h6">
                                    {`Email invite status: Invite not sent`}
                                </Typography>
                            </Grid>
                        }
                        {roll && (roll.email_data && roll.email_data.inviteResponse) && (roll.email_data.inviteResponse.length > 0 && roll.email_data.inviteResponse[0].statusCode < 400) &&
                            <Grid item sm={12}>
                                <Typography align='left' gutterBottom variant="h6" component="h6">
                                    {`Email invite status: Success`}
                                </Typography>
                            </Grid>
                        }
                        {roll && (roll.email_data && roll.email_data.inviteResponse) && !(roll.email_data.inviteResponse.length > 0 && roll.email_data.inviteResponse[0].statusCode < 400) &&
                            <Grid item sm={12}>
                                <Typography align='left' gutterBottom variant="h6" component="h6">
                                    {`Email invite status: Failed`}
                                </Typography>
                                <Typography align='left' gutterBottom component="p">
                                    {`Debug Info: ${JSON.stringify(roll.email_data.inviteResponse)}`}
                                </Typography>
                            </Grid>
                        }
                        <Grid item sm={4} sx={{py:1}}>
                            <PermissionHandler permissions={permissions} requiredPermission={'canSendEmails'}>
                                <SecondaryButton onClick={() => { setDialogOpen(true) }} > Draft Email </SecondaryButton>
                            </PermissionHandler>
                        </Grid>
                        <Grid item sm={4} sx={{py:1}}>
                            <SecondaryButton
                                sx={{
                                    ml: 0,
                                    ...(requiresRevealFlow && {
                                        backgroundColor: '#d32f2f',
                                        color: 'white',
                                        border: '2px solid #b71c1c',
                                        '&:hover': {
                                            backgroundColor: '#b71c1c',
                                        }
                                    })
                                }}
                                onClick={onCopyVotingUrl}
                            >
                                {requiresRevealFlow ? 'Obtain Unique Voting URL' : 'Copy Unique Voting URL'}
                            </SecondaryButton >
                        </Grid>
                        {revealedVoterId && (
                            <Grid item sm={12} sx={{py:2}}>
                                <Paper sx={{ p: 2, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
                                    <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 'bold'}}>
                                        Unique Voting URL:
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body1" sx={{ fontFamily: 'monospace', letterSpacing: '0.1em', wordBreak: 'break-all' }}>
                                            {`${window.location.origin}/${election.election_id}/id/${revealedVoterId.slice(0, 8)}****`}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/${election.election_id}/id/${revealedVoterId}`);
                                                setSnack({
                                                    message: 'Voting URL copied to clipboard',
                                                    severity: 'success',
                                                    open: true,
                                                    autoHideDuration: 3000,
                                                });
                                            }}
                                        >
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Paper>
                            </Grid>
                        )}
                    </>
                }
                {roll.state === 'registered' &&
                    <Grid item sm={4} sx={{py:1}}>
                        <PermissionHandler permissions={permissions} requiredPermission={'canApproveElectionRoll'}>
                            <SecondaryButton onClick={() => { onApprove() }} > Approve </SecondaryButton >
                        </PermissionHandler>
                    </Grid>}
                {flags.isSet('VOTER_FLAGGING') && <>
                    {roll.state !== 'flagged' &&
                        <Grid item sm={4} sx={{py:1}}>

                            <PermissionHandler permissions={permissions} requiredPermission={'canFlagElectionRoll'}>
                                <SecondaryButton onClick={() => { onFlag() }} > Flag </SecondaryButton >
                            </PermissionHandler>
                        </Grid>}
                    {roll.state === 'flagged' &&
                        <Grid item sm={4} sx={{py:1}}>
                            <PermissionHandler permissions={permissions} requiredPermission={'canUnflagElectionRoll'}>
                                <SecondaryButton onClick={() => { onUnflag() }} > Unflag </SecondaryButton >
                            </PermissionHandler>
                        </Grid>}
                    {roll.state === 'flagged' &&
                        <Grid item sm={4} sx={{py:1}}>
                            <PermissionHandler permissions={permissions} requiredPermission={'canInvalidateElectionRoll'}>
                                <SecondaryButton onClick={() => { onInvalidate() }} > Invalidate </SecondaryButton>
                            </PermissionHandler>
                        </Grid>}
                </>}
                {roll?.history &&
                    <TableContainer component={Paper}>
                        <Table style={{ width: '100%' }} aria-label="simple table">
                            <TableHead>
                                <TableCell> Action </TableCell>
                                <TableCell align="right"> Actor </TableCell>
                                <TableCell align="right"> {`Timestamp (${getLocalTimeZoneShort()})`} </TableCell>
                            </TableHead>
                            <TableBody>
                                {roll.history.map((history, i) => (
                                    <TableRow key={i} >
                                        <TableCell component="th" scope="row">
                                            {history.action_type}
                                        </TableCell>
                                        <TableCell align="right" >{history.actor}</TableCell>
                                        <TableCell align="right" >{ t('listed_datetime', {listed_datetime: history.timestamp} )}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                }
                <Grid item sm={4}>
                    <SecondaryButton onClick={() => { onClose() }} > Close </SecondaryButton>
                </Grid>
            </Grid>
            <SendEmailDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={onSendEmail}
                targetedEmail={roll.email}
            />

            {requiresRevealFlow &&
                <Dialog
                    open={confirmDialogOpen}
                    onClose={() => setConfirmDialogOpen(false)}
                >
                    <DialogTitle>Obtain Unique Voting URL</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            This action reveals the unique voting link for the voter. This should only be done if the voter is unable to acquire their voting link through their email inbox.
                        </DialogContentText>
                        <DialogContentText sx={{ mt: 2 }}>
                            This action will create a permanent audit log entry and record who performed this action.
                        </DialogContentText>
                        <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
                            Would you like to proceed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <SecondaryButton onClick={() => setConfirmDialogOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton onClick={handleConfirmReveal} autoFocus>
                            Confirm
                        </PrimaryButton>
                    </DialogActions>
                </Dialog>
            }
        </Container>
    )
}

export default EditElectionRoll
