import { useState, useMemo } from 'react';
import { useNavigate } from "react-router";
import { PrimaryButton, UtilityButton } from '../../styles.js';
import { Box, Paper, TextField, Typography } from '@mui/material';
import { usePostElection } from '~/hooks/useAPI';
import { setCookie, useCookie } from '~/hooks/useCookie';
import { NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import { setVoterAuthenticationMode } from '@equal-vote/star-vote-shared/domain_model/VoterAuthenticationMode';
import { makeUniqueIDSync, makeID, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

import { hashString, TransitionBox, useSubstitutedTranslation } from '../../util.js';
import useAuthSession from '../../AuthSessionContextProvider.js';
import RaceForm from '../Races/RaceForm.js';
import useConfirm from '../../ConfirmationDialogProvider.js';
import useElection, { ElectionContextProvider } from '../../ElectionContextProvider.js';
import WizardBasics from './WizardBasics.js';

export const makeDefaultElection = () => {
    const ids = [];
    for(let i = 0; i < 1; i++){
        ids.push(makeUniqueIDSync(
            ID_PREFIXES.CANDIDATE,
            ID_LENGTHS.CANDIDATE,
            (id: string) => ids.includes(id)
        ));
    }

    return {
        title: '',
        state: 'draft',
        frontend_url: '',
        owner_id: '0',
        is_public: false,
        ballot_source: 'live_election',
        races: [ {
            title: '',
            race_id: '0',
            num_winners: undefined,
            voting_method: undefined,
            candidates: ids.map(id => ({
                candidate_id: id,
                candidate_name: ''
            })),
            precincts: undefined,
        } ],
        settings: {
            voter_access: undefined, // onCustomize is responsible for setting this
            voter_authentication: {
                voter_id: true,
            },
            ballot_updates: false,
            public_results: true,
            random_candidate_order: true,
            require_instruction_confirmation: false,
            draggable_ballot: false,
            term_type: undefined,
        }
    } as NewElection
};

const MultiRaceTitleSection = ({ onCustomize }: { onCustomize: (election: NewElection) => Promise<void> }) => {
    const { election, updateElection, t } = useElection();
    const [showDescription, setShowDescription] = useState(false);

    return (
        <Box sx={{ textAlign: 'left', pl: 1 }}>
            <TextField
                required
                label={t('election_details.title')}
                value={election.title}
                fullWidth
                sx={{ mt: 1, mb: 1, boxShadow: 2 }}
                onChange={(e) => updateElection(el => { el.title = e.target.value })}
                slotProps={{ htmlInput: { 'aria-label': 'Title' } }}
            />
            <UtilityButton onClick={() => setShowDescription(d => !d)}>
                {showDescription ? '-' : '+'} Description (Optional)
            </UtilityButton>
            {showDescription && (
                <TextField
                    multiline
                    fullWidth
                    label="Description"
                    value={election.description ?? ''}
                    minRows={3}
                    sx={{ mt: 1, mb: 1, boxShadow: 2 }}
                    onChange={(e) => updateElection(el => { el.description = e.target.value })}
                />
            )}
            <Typography sx={{ mt: 1 }}>{t('wizard.add_races_later')}</Typography>
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 1 }}>
                <PrimaryButton
                    disabled={!election.title}
                    onClick={() => onCustomize(election)}
                >
                    Next
                </PrimaryButton>
            </Box>
        </Box>
    );
};

const Wizard = () => {
    const authSession = useAuthSession();
    const defaultTempId = useMemo(() => makeID(ID_PREFIXES.VOTER, ID_LENGTHS.VOTER), []);
    const [tempID] = useCookie('temp_id', defaultTempId);
    const navigate = useNavigate()
    const { makeRequest: postElection } = usePostElection()
    const [election, setElection] = useState<NewElection>(makeDefaultElection())
    const [multiRace, setMultiRace] = useState(undefined);

    const confirm = useConfirm();

    const {t} = useSubstitutedTranslation(election.settings.term_type);

    const onAddElection = async (election, subPage) => {
        let submitTempID = tempID;
        if (tempID === '0') {
            submitTempID = makeID(ID_PREFIXES.VOTER, ID_LENGTHS.VOTER);
            setCookie('temp_id', submitTempID);
        }
        election.owner_id = authSession.isLoggedIn() ? authSession.getIdField('sub') : submitTempID;

        const claimKey = crypto.randomUUID();
        election.claim_key_hash = hashString(claimKey);

        if(multiRace) election.races = [];

        const newElection = await postElection({Election: election})
        if (!newElection) throw Error("Error submitting election");

        // The useCookie pattern won't work since I don't know election_id until now
        setCookie(`${newElection.election.election_id}_claim_key`, claimKey, null)

        navigate(`/${newElection.election.election_id}${subPage}`)
    }

    const onCustomize = async (electionToSubmit: NewElection) => {
        const finalElection = {
            ...electionToSubmit,
            settings: {
                ...electionToSubmit.settings,
                voter_access: 'open',
                contact_email: authSession.isLoggedIn() ? authSession.getIdField('email') : '',
            }
        };
        await onAddElection(finalElection, '/admin/build_ballot');
    };

    const onNext = async (editedRace) => {
        const updatedElection = {
            ...election,
            races: [editedRace],
            title: editedRace.title,
            description: editedRace.description,
        }
        const confirmed = await confirm({...t('wizard.publish_confirm'), dismissable: true});
        if (confirmed === null) {
            return; // dialog dismissed — stay on wizard with inputs intact
        }
        if (confirmed) {
            onAddElection({...updatedElection, state: 'finalized', settings: setVoterAuthenticationMode(updatedElection.settings, 'open_unique_cookie')}, '/')
        } else {
            await onCustomize(updatedElection);
        }
    }

    const width = {xs: '300px', sm: '500px'};

    const pageSX = {
        display: 'flex',
        gap: 0,
        width: width,
        flexDirection: 'column',
        textAlign: 'center',
        padding: 3,
        borderRadius: '20px',
        minWidth: {xs: '0px', md: '400px'},
        p: {
            xs: 1,
            sm: 3,
        }
    }

    return <ElectionContextProvider id={undefined} localElection={election} setLocalElection={setElection}>
        <Paper className='wizard' elevation={5} sx={{
            width: width,
            margin: 'auto',
            overflow: 'clip',
        }}>
            <Box sx={pageSX}>
                <Typography variant='h5' color={'lightShade.contrastText'}>{t('wizard.title')}</Typography>
                <WizardBasics multiRace={multiRace} setMultiRace={setMultiRace}/>
                <Box sx={{ position: 'relative' }}>
                    <TransitionBox absolute enabled={multiRace === true}>
                        <MultiRaceTitleSection onCustomize={onCustomize} />
                    </TransitionBox>
                    <TransitionBox enabled={multiRace === false}>
                        <RaceForm
                            raceIndex={0}
                            onConfirm={onNext}
                            styling='Wizard'
                        />
                    </TransitionBox>
                </Box>
            </Box>
        </Paper>
    </ElectionContextProvider>
}

export default Wizard
