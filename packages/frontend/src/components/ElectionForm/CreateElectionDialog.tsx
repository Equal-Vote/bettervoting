import { Box, capitalize, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Step, StepContent, StepLabel, Stepper, TextField, Typography } from "@mui/material";
import { PrimaryButton, SecondaryButton, Tip } from "../styles";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { ElectionTitleField } from "./Details/ElectionDetailsForm";
import { RowButtonWithArrow, useSubstitutedTranslation } from "../util";
import { NewElection } from "@equal-vote/star-vote-shared/domain_model/Election";
import { DateTime } from "luxon";
import useAuthSession from "../AuthSessionContextProvider";
import { usePostElection } from "~/hooks/useAPI";
import { TermType } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { useNavigate } from "react-router";
import { TimeZone } from "@equal-vote/star-vote-shared/domain_model/Util";

/////// PROVIDER SETUP /////
export interface ICreateElectionContext {
    open: boolean
    quickPoll: NewElection
    openDialog: (quickPoll?: NewElection) => void
    closeDialog: () => void
}

export const CreateElectionContext = createContext<ICreateElectionContext>(null);

export const CreateElectionContextProvider = ({ children }: { children: ReactNode }) => {
    const [open, setOpen] = useState(false);
    const [quickPoll, setQuickPoll] = useState(undefined);

    const openDialog = (quickPoll: NewElection = undefined) => {
        setQuickPoll(quickPoll);
        setOpen(true);
    }

    const closeDialog = () => {
        setQuickPoll(undefined);
        setOpen(false);
    }

    return <CreateElectionContext.Provider
        value={{ open, quickPoll, openDialog, closeDialog }}
    >
        {children}
    </CreateElectionContext.Provider>
}

/////// DIALOG /////

export const defaultElection: NewElection = {
    title: '',
    owner_id: '',
    description: '',
    state: 'draft',
    frontend_url: '',
    ballot_source: 'live_election',
    races: [],
    settings: {
        voter_authentication: {
            voter_id: false,
            email: false,
            ip_address: false
        },
        ballot_updates: false,
        public_results: false,
        time_zone: DateTime.now().zone.name as TimeZone,
        random_candidate_order: false,
        require_instruction_confirmation: true,
        draggable_ballot: false,
        invitation: undefined,
        // election_term, and voter_access are intentially omitted
        // this let's me start them at undefined for the stepper
    }
}

const templateMappers = {
    'demo': (election: NewElection): NewElection => ({
        ...election,
    }),
    /*'public': (election:NewElection):NewElection => ({
        ...election,
        is_public: true,
        settings: {
            ...election.settings,
            voter_authentication: {
                ...election.settings.voter_authentication,
                voter_id: true
            },
        }
    }),*/
    'unlisted': (election: NewElection): NewElection => ({
        ...election,
        is_public: false,
        settings: {
            ...election.settings,
            voter_authentication: {
                ...election.settings.voter_authentication,
                voter_id: true
            },
        }
    }),
    'email_list': (election) => ({
        ...election,
        is_public: false,
        settings: {
            ...election.settings,
            voter_authentication: {
                ...election.settings.voter_authentication,
                // email: true <- this means login will be required, that's not what we want for this setting. TODO: figure out refactored name
                voter_id: true
            },
            invitation: 'email',
        }
    }),
    'id_list': (election) => ({
        ...election,
        is_public: false,
        settings: {
            ...election.settings,
            voter_authentication: {
                ...election.settings.voter_authentication,
                voter_id: true
            },
        }
    }),
}

const StepButtons = ({ activeStep, setActiveStep, canContinue }: { activeStep: number, setActiveStep: React.Dispatch<React.SetStateAction<number>>, canContinue: boolean }) => <>
    {activeStep > 0 &&
        <SecondaryButton
            onClick={() => setActiveStep(i => i - 1)}
            sx={{ mt: 1, mr: 1 }}
        >
            Back
        </SecondaryButton>
    }
    {activeStep < 3 && // hard coding this for now
        <PrimaryButton
            fullWidth={false}
            variant="contained"
            disabled={!canContinue}
            onClick={() => setActiveStep(i => i + 1)}
            sx={{ mt: 1, mr: 1 }}
        >
            Continue
        </PrimaryButton>
    }
</>

const CreateElectionDialog = () => {
    const createElectionContext = useContext(CreateElectionContext);

    const [activeStep, setActiveStep] = useState(0);

    const onClose = () => {
        setActiveStep(0);
        createElectionContext.closeDialog();
    };

    const [errors, setErrors] = useState({ title: '' });

    const [election, setElection] = useState(defaultElection);

    const { t } = useSubstitutedTranslation(election.settings.term_type);

    const { makeRequest: postElection } = usePostElection()

    const authSession = useAuthSession()
    const navigate = useNavigate()

    useEffect(() => {
        const q = createElectionContext.quickPoll;
        if (!createElectionContext.quickPoll) return;

        // quick poll also specifies a number of other settings but we're not keeping those, we're only keeping the information that the user specified
        setElection({
            ...defaultElection,
            title: q.title,
            races: [
                {
                    ...q.races[0],
                    title: q.title,
                    candidates: q.races[0].candidates.filter(candidate => candidate.candidate_name.length > 0)
                }
            ]
        })
    }, [createElectionContext.quickPoll])

    const onAddElection = async (election) => {
        // calls post election api, throws error if response not ok
        election.owner_id = authSession.getIdField('sub');

        const newElection = await postElection({
            Election: election,
        })
        if (!newElection) throw Error("Error submitting election");

        navigate(`/${newElection.election.election_id}/admin`)
        onClose()
    }

    return <Dialog
        open={createElectionContext.open}
        onClose={onClose}
        scroll={'paper'}
        sx={{
            maxHeight: '90%',
            '@media(max-width: 500px)': {
                margin: '8px', // default is 32px
                maxHeight: 'calc(100% - 16px)',
                width: 'calc(100% - 16px)',
            }
        }}
        keepMounted
        fullWidth
        maxWidth='sm'
    >
        <DialogTitle> {t('election_creation.dialog_title')} </DialogTitle>
        <DialogContent>
            <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                    <StepLabel>{t('election_creation.term_title')} <strong>{
                        election.settings.term_type === undefined ? '' : capitalize(t(`keyword.${election.settings.term_type}.election`))
                    }</strong></StepLabel>
                    <StepContent>
                        <Typography>{t('election_creation.term_question')}
                            <Tip name='polls_vs_elections' />
                        </Typography>
                        <RadioGroup row>
                            {['poll', 'election'].map((type, i) =>
                                <FormControlLabel
                                    key={i}
                                    value={capitalize(t(`keyword.${type}.election`))}
                                    control={<Radio />}
                                    label={capitalize(t(`keyword.${type}.election`))}
                                    onClick={() => {
                                        setElection({
                                            ...election,
                                            settings: {
                                                ...election.settings,
                                                term_type: type as TermType
                                            }
                                        });
                                        setTimeout(() => setActiveStep(1), 250);
                                    }}
                                    checked={election.settings.term_type === type}
                                />
                            )}
                        </RadioGroup>
                    </StepContent>
                </Step>
                <Step>
                    <StepLabel>{t('election_creation.title_title')} <strong>{election.title && election.title}</strong></StepLabel>
                    <StepContent>
                        <Typography>{t('election_creation.title_question')}</Typography>
                        <ElectionTitleField
                            termType={election.settings.term_type}
                            value={election.title}
                            onUpdateValue={
                                (value) => setElection({ ...election, title: value })
                            }
                            errors={errors}
                            setErrors={setErrors}
                            showLabel={false}
                        />
                        <StepButtons activeStep={1} setActiveStep={setActiveStep} canContinue={/^[^\s][a-zA-Z0-9\s]{3,49}$/.test(election.title) && errors.title == ''} />
                    </StepContent>
                </Step>
                <Step>
                    <StepLabel>{t('election_creation.restricted_title')} <strong>
                        {election.settings.voter_access !== undefined && t(`keyword.${election.settings.voter_access === 'closed' ? 'yes' : 'no'}`)}
                    </strong></StepLabel>
                    <StepContent>
                        <Typography>
                            {t('election_creation.restricted_question')}
                        </Typography>

                        <RadioGroup row>
                            {[true, false].map((restricted, i) =>
                                <FormControlLabel
                                    key={i}
                                    value={restricted}
                                    control={<Radio />}
                                    label={t(`keyword.${restricted ? 'yes' : 'no'}`)}
                                    onClick={() => {
                                        setElection({
                                            ...election, settings: {
                                                ...election.settings,
                                                voter_access: restricted ? 'closed' : 'open',
                                                contact_email: restricted ? (
                                                    (election.settings.contact_email != undefined && election.settings.contact_email != '') ?
                                                        election.settings.contact_email : authSession.getIdField('email')
                                                ) : ''
                                            }
                                        })
                                    }}
                                    checked={election.settings.voter_access === (restricted ? 'closed' : 'open')}
                                />
                            )}
                        </RadioGroup>

                        <Box sx={{
                            // 60px copied from unset, then added some for padding
                            height: (election.settings.voter_access == 'closed' ? '90px' : 0),
                            opacity: (election.settings.voter_access == 'closed' ? 1 : 0),
                            transition: 'height .4s, opacity .7s',
                            overflow: 'hidden',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <FormControlLabel control={
                                <TextField
                                    id='contact_email'
                                    name='contact_email'
                                    value={election.settings.contact_email}
                                    onChange={(e) =>
                                        setElection({
                                            ...election, settings: {
                                                ...election.settings,
                                                contact_email: e.target.value
                                            }
                                        })
                                    }
                                    variant='standard'
                                    fullWidth
                                    sx={{ mt: -1, display: 'block' }}
                                />}
                                label={t(`election_settings.contact_email`)}
                                labelPlacement='top'
                                sx={{
                                    alignItems: 'start',
                                }}
                            />
                        </Box>

                        <StepButtons activeStep={2} setActiveStep={setActiveStep} canContinue={election.settings.voter_access !== undefined} />
                    </StepContent>
                </Step>
                <Step>
                    <StepLabel>{t('election_creation.template_title')}</StepLabel>
                    <StepContent>
                        <Typography>
                            {t('election_creation.template_prompt')}
                        </Typography>
                        <Box style={{ height: '10px' }} /> {/*hacky padding*/}
                        {(election.settings.voter_access === 'closed' ? ['email_list', 'id_list'] : ['demo', 'unlisted']).map((name) =>
                            <RowButtonWithArrow
                                title={t(`election_creation.${name}_title`)}
                                description={t(`election_creation.${name}_description`)}
                                key={name}
                                onClick={() => onAddElection(templateMappers[name](election))}
                                ariaLabel={t(`election_creation.${name}_title`)}
                            />
                        )}

                        <StepButtons activeStep={3} setActiveStep={setActiveStep} canContinue={false} />
                    </StepContent>
                </Step>
            </Stepper>
        </DialogContent>
        <DialogActions>
            <PrimaryButton
                type='button'
                variant="contained"
                // width="100%"
                fullWidth={false}
                onClick={onClose}>
                Cancel
            </PrimaryButton>
        </DialogActions>
    </Dialog>
}

export default CreateElectionDialog;
