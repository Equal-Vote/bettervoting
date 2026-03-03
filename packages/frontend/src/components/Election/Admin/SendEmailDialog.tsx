import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, MenuItem, Select, SelectChangeEvent, Typography } from "@mui/material";
import { useState } from "react";
import useAuthSession from "~/components/AuthSessionContextProvider";
import useElection from "~/components/ElectionContextProvider";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import { LabelledTextField, RowButtonWithArrow } from "~/components/util";
import { useSendEmails } from "~/hooks/useAPI";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";


interface SendEmailDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { subject: string, body: string, target: string }) => void;
    targetedEmail?: string;
    electionRoll?: ElectionRoll[]; // TODO: replace this with the official type
}

interface SelectFieldProps {
    label: string;
    value: string;
    values: string[];
    setter: (value: string) => void;
    disabled?: boolean;
}

const SendEmailDialog = ({open, onClose, onSubmit, targetedEmail=undefined, electionRoll=undefined}:SendEmailDialogProps) => {
    const authSession = useAuthSession()
    const [audience, setAudience] = useState(targetedEmail? 'single' : 'all')
    const [templateChosen, setTemplateChosen] = useState(false)
    const [emailSubject, setEmailSubject] = useState('Update for Election')
    const [emailBody, setEmailBody] = useState('')
    const [testEmails, setTestEmails] = useState(authSession.getIdField('email')) // TODO: replace this with the official type
    const {election, t} = useElection();
    const sendEmails = useSendEmails(election.election_id)

    const SelectField = ({label, value, values, setter, disabled=false}: SelectFieldProps) => 
        <FormControlLabel control={
                <Select value={value} sx={{width: '100%'}} onChange={(ev: SelectChangeEvent) => {
                    setter(ev.target.value as string)}
                }>
                    {values.map((v, i) => <MenuItem key={i} value={v}>{t(`voters.email_form.${v}`, {voter_id: targetedEmail})}</MenuItem>)}
                </Select>
            }
            disabled={disabled}
            label={label}
            labelPlacement='top'
            sx={{
                alignItems: 'start',
                width: {xs: '90%'}
            }}
        />

    const close = () => {
        // Brief delay so that the animation isn't seen during the close
        setTimeout(() => setTemplateChosen(false), 500);
        onClose()
    }

    const setTemplate = (template_id) => {
        setTemplateChosen(true);
        setEmailSubject(t(`emails.${template_id}.subject`,{
            skipProcessing: true, // processing must occur in backend
            title: election.title,
        }))
        setEmailBody(t(`emails.${template_id}.body`, {
            skipProcessing: true, // processing must occur in backend
            title: election.title,
            description: election.description ? `\n${t('emails.election_description', {description: election.description, skipProcessing: true})}\n`: '',
            voting_begin: election.start_time ? `\n${t('emails.voting_begin', {datetime: election.start_time, skipProcessing: true})}\n` : '',
            voting_end: election.end_time ? `\n${t('emails.voting_end', {datetime: election.end_time, skipProcessing: true})}\n` : '',
        }))
    }

    const getVoterCount = () => {
        if(!electionRoll) return 0;
        if(audience == 'single') return 1;
        if(audience == 'all') return electionRoll.length;
        if(audience == 'has_voted') return electionRoll.filter(roll => roll.submitted).length
        if(audience == 'has_not_voted') return electionRoll.filter(roll => !roll.submitted).length
    }

    const warning: string = (() => {
        if(election.state == 'draft')
            return t('emails.draft_warning')
        const currentTime = new Date();
        if(election.start_time && currentTime.getTime() < new Date(election.start_time).getTime())
            return t('emails.pre_start_warning', {datetime: election.start_time})
        if(election.end_time && currentTime.getTime() > new Date(election.end_time).getTime())
            return t('emails.post_end_warning', {datetime: election.end_time})
        return '';
    })();

    // I experimented with these sizes till it felt right I wish there was a more dynamic solution, while maintaining the horizontal transition
    const sizes = {xs: '220px', sm: '380px', md: '550px'};
    return <Dialog
        open={open}
        onClose={close}
        sx={audience != 'single' ? {background: '#0000bb88'} : {}}
    >
        <DialogTitle>Prepare Email Blast</DialogTitle>
        <DialogContent>
            <Box display='flex' flexDirection='row'>
                <Box display='flex' flexDirection='row-reverse' sx={{
                    width: templateChosen ? 0 : sizes,
                    height: 'auto',
                    opacity: templateChosen ? 0 : 1,
                    overflow: 'hidden',
                    transition: 'width .4s, opacity .7s',
                }}>
                    {/*minWidth keeps text from wrapping during the transition*/}
                    <Box display='flex' gap={1} flexDirection={'column'} sx={{width: '100%', minWidth: sizes}}>
                        <Typography sx={{mb: 1, marginLeft: '15px'}}>Which template would you like to start with?</Typography>
                        {['invite', /*'receipt', */'blank'].map((v, i) =>
                            <Box key={i} sx={{ml: '15px'}}>
                                <RowButtonWithArrow
                                    title={t(`voters.email_form.${v}`, {voter_id: targetedEmail})}
                                    onClick={() => setTemplate(v)}
                                    ariaLabel='Email Template'
                                />
                            </Box>
                        )}
                    </Box>
                </Box>
                {/* using nested boxes so that the width transition doesn't impact to size of the elements*/}
                <Box sx={{
                    width: !templateChosen ? 0 : sizes,
                    opacity: !templateChosen ? 0 : 1, 
                    overflow: 'hidden',
                    transition: 'width .4s, opacity .7s',
                }}>
                    <Box display='flex' flexDirection='column' gap={3} sx={{
                        width: sizes
                    }}>
                        {/* 93% set to have right side of button match other text fields*/}
                        <Box display='flex' sx={{width: {xs: '100%', md: '93%'}, flexDirection:{xs: 'column', md: 'row'}, alignItems: 'center', gap: {xs: 1, md: 0}}}>
                            <LabelledTextField label='Test Email(s)' fullWidth value={testEmails} setter={setTestEmails}/>
                            {/* 56px is to align with text box */}
                            <SecondaryButton
                                sx={{height: '56px', mt: 'auto', mb: 0, maxWidth: '200px'}}
                                onClick={() => sendEmails.makeRequest({
                                    target: 'test',
                                    email: { subject: emailSubject, body: emailBody },
                                    testEmails: testEmails.split(',')
                                })}
                            >Send&nbsp;Test</SecondaryButton>
                        </Box>
                        <Divider/>
                        <SelectField
                            label='Audience'
                            disabled={!!targetedEmail}
                            value={audience}
                            values={targetedEmail? ['single']: ['all', 'has_voted', 'has_not_voted']}
                            setter={setAudience}
                        />
                        <LabelledTextField label='Email Subject' fullWidth value={emailSubject} setter={setEmailSubject}/>
                        <LabelledTextField
                            label='Email Body'
                            fullWidth
                            rows={10}
                            value={emailBody}
                            setter={setEmailBody}
                            helperText="Supports **bold**, [link text](url), __VOTE_BUTTON__, and __ELECTION_HOME_BUTTON__"
                        />
                    </Box>
                </Box>
            </Box>
        </DialogContent>
        <DialogActions>
            <Box display='flex' flexDirection='column' sx={{width: sizes}}>
                {warning && <Alert 
                    severity='warning'
                    sx={{
                        margin: 1,
                        padding: '.2cm',
                    }}>
                    <Typography>{warning}</Typography>
                </Alert>}
                <Box display='flex' flexDirection='row-reverse' gap={2}>
                    <PrimaryButton
                        disabled={!templateChosen}
                        onClick={() => {
                            setTemplateChosen(false)
                            onSubmit({
                                subject: emailSubject,
                                body: emailBody,
                                target: audience,
                            })
                        }}>
                        {targetedEmail? 'Send Email' : `Send ${getVoterCount()} Emails`}
                    </PrimaryButton>
                    <SecondaryButton
                        onClick={close}>
                        {t('ballot.dialog_cancel')}
                    </SecondaryButton>
                </Box>
            </Box>
        </DialogActions>
    </Dialog>
}

export default SendEmailDialog