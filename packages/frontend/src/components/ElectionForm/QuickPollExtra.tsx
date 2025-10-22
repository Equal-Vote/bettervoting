import { Typography, Stepper, Step, StepLabel, StepContent, FormControlLabel, Checkbox, TextField, FormHelperText, RadioGroup, Radio, Box } from "@mui/material";
import { t } from "i18next";
import { RowButtonWithArrow, useSubstitutedTranslation } from "../util";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "../styles";
import { NewElection } from "@equal-vote/star-vote-shared/domain_model/Election";
import useAuthSession from "../AuthSessionContextProvider";
import { usePostElection } from "~/hooks/useAPI";
import { useNavigate } from "react-router";
import { title } from "process";

const templateMappers = {
    'demo': (election: NewElection): NewElection => ({
        ...election,
    }),
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

export default ({election, setElection, onBack}) => {
    const [stepperStep, setStepperStep] = useState(0);
    const authSession = useAuthSession();
    const { makeRequest: postElection } = usePostElection()
    const navigate = useNavigate();
    const {t} = useSubstitutedTranslation(election.settings.term_type);
    const [titleMatchesRace, setTitleMatchesRace] = useState(true);

    const StepButtons = ({ activeStep, setActiveStep, canContinue }: { activeStep: number, setActiveStep: React.Dispatch<React.SetStateAction<number>>, canContinue: boolean }) => <>
        <SecondaryButton
            onClick={() => activeStep == 0 ? onBack() : setActiveStep(i => i - 1)}
            sx={{ mt: 1, mr: 1 }}
        >
            Back
        </SecondaryButton>
        {activeStep < 2 && // hard coding this for now
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

    const onAddElection = async (election) => {
        // calls post election api, throws error if response not ok
        election.owner_id = authSession.getIdField('sub');

        const newElection = await postElection({Election: election})
        if (!newElection) throw Error("Error submitting election");

        navigate(`/${newElection.election.election_id}/admin`)
    }

    return <>
        <Typography variant='h5' color={'lightShade.contrastText'}>Just a few more questions...</Typography>
        <Stepper activeStep={stepperStep} orientation="vertical">
            <Step>
                <StepLabel>{t('election_creation.title_title')} <strong>{election.title && election.title}</strong></StepLabel>
                <StepContent>
                    <Typography>{t('election_creation.title_question')}</Typography>
                    <FormControlLabel control={<Checkbox checked={titleMatchesRace} />} label="same as poll question" onClick={() => {
                        let newMatchesRace = !titleMatchesRace;
                        setTitleMatchesRace(newMatchesRace);
                        if(newMatchesRace){
                            setElection({
                                ...election,
                                title: election.races[0].title,
                            })
                        }
                    }}/>
                    <TextField
                        inputProps={{ "aria-label": "Title" }}
                        error={false}
                        required
                        disabled={titleMatchesRace}
                        id="election-title"
                        label={t('election_details.title')}
                        type="text"
                        value={election.title}
                        sx={{
                            m: 0,
                            p: 0,
                            boxShadow: 2,
                        }}
                        fullWidth
                        onChange={(e) => setElection({...election, title: e.target.value})}
                    />
                    <FormHelperText error sx={{ pl: 1, pt: 0 }}>
                        {/* TODO: Add errors */}
                    </FormHelperText>
                    <StepButtons activeStep={0} setActiveStep={setStepperStep} canContinue={true}/> {/*canContinue={/^[^\s][a-zA-Z0-9\s]{3,49}$/.test(election.title) /*&& errors.title == ''} />*/}
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

                    <StepButtons activeStep={1} setActiveStep={setStepperStep} canContinue={election.settings.voter_access !== undefined} />
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

                    <StepButtons activeStep={2} setActiveStep={setStepperStep} canContinue={false} />
                </StepContent>
            </Step>
        </Stepper>
    </>
}