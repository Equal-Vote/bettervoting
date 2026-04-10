import { ExpandLess, ExpandMore } from "@mui/icons-material";
import EditIcon from '@mui/icons-material/Edit';
import { Box, Button, FormControlLabel, FormHelperText, IconButton, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Election, NewElection } from "@equal-vote/star-vote-shared/domain_model/Election";
import { Race as IRace, VotingMethod } from "@equal-vote/star-vote-shared/domain_model/Race";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import { AddIcon, methodValueToTextKey, TransitionBox, useSubstitutedTranslation } from "~/components/util";
import { RaceErrors } from "./useEditRace";

type MethodStep = 'unset' | 'family' | 'num_winners' | 'method' | 'done';
type MethodFamily = 'single_winner' | 'bloc_multi_winner' | 'proportional_multi_winner' | undefined;

const stepIndex = {
    unset: 0,
    family: 1,
    num_winners: 2,
    method: 3,
    done: 4,
};

const PR_METHODS: VotingMethod[] = ['STV', 'STAR_PR'];

const getMethodFamily = (votingMethod: VotingMethod | undefined, numWinners: number | undefined): MethodFamily => {
    if (votingMethod === undefined || numWinners === undefined) {
        return undefined;
    }

    if (numWinners === 1) {
        return 'single_winner';
    }

    return PR_METHODS.includes(votingMethod) ? 'proportional_multi_winner' : 'bloc_multi_winner';
};

export interface VotingMethodValue {
    num_winners: number | undefined,
    voting_method: VotingMethod | undefined,
}

export interface VotingMethodSelectorHandle {
    getValue: () => VotingMethodValue,
}

interface VotingMethodSelectorProps {
    election: Election | NewElection,
    error?: RaceErrors['votingMethod'],
    initialRace: IRace,
    isDisabled: boolean,
    onClearError: (field: keyof RaceErrors) => void,
    open?: boolean,
}

const VotingMethodSelector = forwardRef<VotingMethodSelectorHandle, VotingMethodSelectorProps>(function VotingMethodSelector({
    election,
    error = '',
    initialRace,
    isDisabled,
    onClearError,
    open,
}, ref) {
    const { t } = useSubstitutedTranslation();
    const [methodStep, setMethodStepState] = useState<MethodStep>(initialRace.voting_method == undefined ? 'unset' : 'done');
    const [votingMethod, setVotingMethod] = useState<VotingMethod | undefined>(initialRace.voting_method);
    const [numWinners, setNumWinners] = useState<number | undefined>(initialRace.num_winners);
    const [inputtedWinners, setInputtedWinners] = useState(initialRace.num_winners == undefined ? '' : String(initialRace.num_winners));
    const [showAllMethods, setShowAllMethods] = useState(false);
    const [methodFamily, setMethodFamily] = useState<MethodFamily>(getMethodFamily(initialRace.voting_method, initialRace.num_winners));

    useEffect(() => {
        setMethodStepState(initialRace.voting_method == undefined ? 'unset' : 'done');
        setVotingMethod(initialRace.voting_method);
        setNumWinners(initialRace.num_winners);
        setInputtedWinners(initialRace.num_winners == undefined ? '' : String(initialRace.num_winners));
        setShowAllMethods(false);
        setMethodFamily(getMethodFamily(initialRace.voting_method, initialRace.num_winners));
    }, [initialRace, open]);

    useImperativeHandle(ref, () => ({
        getValue: () => ({
            num_winners: numWinners,
            voting_method: votingMethod,
        }),
    }), [numWinners, votingMethod]);

    const clearError = () => onClearError('votingMethod');

    const setMethodStep = (step: MethodStep) => {
        clearError();

        if (step === 'unset' || step === 'family') {
            setNumWinners(undefined);
            setMethodFamily(undefined);
            setInputtedWinners('');
        }

        if (step === 'unset' || step === 'family' || step === 'num_winners' || step === 'method') {
            setVotingMethod(undefined);
            setShowAllMethods(false);
        }

        setMethodStepState(step);
    };

    const MethodBullet = ({ value, disabled }: { value: VotingMethod, disabled: boolean }) => <>
        <FormControlLabel
            value={value}
            disabled={disabled}
            control={<Radio onClick={() => setMethodStep('done')} />}
            label={t(`edit_race.methods.${methodValueToTextKey[value]}.title`)}
            sx={{ mb: 0, pb: 0 }}
        />
        <FormHelperText sx={{ pl: 4, mt: -1 }}>
            {t(`edit_race.methods.${methodValueToTextKey[value]}.description`)}
        </FormHelperText>
    </>;

    const FamilyPage = () => <>
        <Typography id="num-winners-label" gutterBottom component="p">
            Single-Winner or Multi-Winner?
        </Typography>
        <RadioGroup
            aria-labelledby="method-family-radio-group"
            name="method-family-radio-buttons-group"
            value={methodFamily}
            onChange={(e) => {
                const nextMethodFamily = e.target.value as Exclude<MethodFamily, undefined>;
                clearError();
                setMethodFamily(nextMethodFamily);

                if (nextMethodFamily === 'single_winner') {
                    setNumWinners(1);
                    setInputtedWinners('1');
                    setMethodStepState('method');
                    return;
                }

                setNumWinners(2);
                setInputtedWinners('2');
                setMethodStepState('num_winners');
            }}
        >
            <FormControlLabel
                value="single_winner"
                disabled={isDisabled}
                control={<Radio />}
                label={t('edit_race.single_winner')}
                sx={{ mb: 0, pb: 0 }}
            />
            <FormControlLabel
                value="bloc_multi_winner"
                disabled={isDisabled}
                control={<Radio />}
                label={t('edit_race.bloc_multi_winner')}
                sx={{ mb: 0, pb: 0 }}
            />
            <FormControlLabel
                value="proportional_multi_winner"
                disabled={isDisabled}
                control={<Radio />}
                label={t('edit_race.proportional_multi_winner')}
                sx={{ mb: 0, pb: 0 }}
            />
        </RadioGroup>
    </>;

    const NumWinnersPage = () => <>
        <Box display='flex' flexDirection='row' gap={3} sx={{ width: '100%' }}>
            <Typography id="num-winners-label" gutterBottom component="p" sx={{ marginTop: 2 }}>
                {t('edit_race.number_of_winners')}:
            </Typography>
            <TextField
                id='num-winners'
                type="number"
                InputProps={{
                    inputProps: {
                        min: 2,
                        "aria-labelledby": "num-winners-label",
                    },
                }}
                fullWidth
                value={inputtedWinners}
                sx={{
                    p: 0,
                    boxShadow: 2,
                    width: '100px',
                    my: 1,
                }}
                onChange={(e) => {
                    clearError();
                    setInputtedWinners(e.target.value);

                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                        setNumWinners(undefined);
                        return;
                    }

                    setNumWinners(parseInt(e.target.value));
                }}
            />
        </Box>
        <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1} sx={{ width: '100%' }}>
            <SecondaryButton onClick={() => setMethodStep('family')}>Back</SecondaryButton>
            <PrimaryButton disabled={inputtedWinners === '' || parseInt(inputtedWinners) < 1} onClick={() => setMethodStepState('method')}>
                Next
            </PrimaryButton>
        </Box>
    </>;

    const VotingMethodPage = () => <>
        <Typography>Which Voting Method?</Typography>
        <RadioGroup
            aria-labelledby="voting-method-radio-group"
            name="voter-method-radio-buttons-group"
            value={votingMethod}
            onChange={(e) => {
                clearError();
                setVotingMethod(e.target.value as VotingMethod);
            }}
        >
            {methodFamily === 'proportional_multi_winner' ?
                <MethodBullet value='STAR_PR' disabled={isDisabled} />
                : <>
                    <MethodBullet value='STAR' disabled={isDisabled} />
                    <MethodBullet value='RankedRobin' disabled={isDisabled} />
                    <MethodBullet value='Approval' disabled={isDisabled} />
                </>}

            <Box
                display='flex'
                justifyContent="left"
                alignItems="center"
                sx={{ width: '100%', ml: -1 }}
            >
                {showAllMethods &&
                    <IconButton aria-labelledby='more-options' disabled={election.state != 'draft'} onClick={() => setShowAllMethods(false)}>
                        <ExpandMore />
                    </IconButton>}
                {!showAllMethods &&
                    <IconButton aria-label='more-options' disabled={election.state != 'draft'} onClick={() => setShowAllMethods(true)}>
                        <ExpandLess />
                    </IconButton>}
                <Typography variant="body1" id='more-options'>
                    More Options
                </Typography>
            </Box>
            <Box sx={{
                height: showAllMethods ? 'auto' : 0,
                opacity: showAllMethods ? 1 : 0,
                overflow: 'hidden',
                transition: 'height .4s, opacity .7s',
                textAlign: 'left',
            }}>
                <Box
                    display='flex'
                    justifyContent="left"
                    alignItems="center"
                    sx={{ width: '100%', pl: 4, mt: -1 }}
                />

                {methodFamily === 'proportional_multi_winner' ?
                    <MethodBullet value='STV' disabled={isDisabled} />
                    : <>
                        <MethodBullet value='Plurality' disabled={isDisabled} />
                        <MethodBullet value='IRV' disabled={isDisabled} />
                    </>}
            </Box>
        </RadioGroup>
        <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1}>
            <SecondaryButton onClick={() => setMethodStep(methodFamily === 'single_winner' ? 'family' : 'num_winners')}>Back</SecondaryButton>
        </Box>
    </>;

    const pad = 0;

    return <Box>
        <Button
            sx={{ mr: "auto", textDecoration: 'none', textTransform: 'none', color: 'black', fontSize: '1.125rem', opacity: 0.86, textAlign: 'left' }}
            disabled={methodStep != 'unset' && methodStep != 'done'}
            onClick={() => setMethodStep('family')}
        >
            {methodStep == 'done' && <EditIcon sx={{ scale: 1, mr: 1 }} />}
            {methodStep != 'done' ? <>
                <AddIcon prefix /> Voting Method
            </> : <>
                {votingMethod == undefined ? '___' : t(`methods.${methodValueToTextKey[votingMethod]}.full_name`)} with&nbsp;
                {numWinners == undefined ? '___' : numWinners}&nbsp;
                {methodFamily == undefined || methodFamily == 'single_winner' ? '' : <>{t(`edit_race.${methodFamily}_adj`)}&nbsp;</>}
                {methodFamily == 'single_winner' ? 'winner' : 'winners'}
            </>}
        </Button>
        <FormHelperText error sx={{ pl: 1 }}>
            {error}
        </FormHelperText>

        <Box sx={{
            position: 'relative',
            height: {
                xs: `${[0, 155, 120, showAllMethods ? 472 : 331, -pad][stepIndex[methodStep]] + pad}px`,
                sm: `${[0, 180, 122, showAllMethods ? 407 : 287, -pad][stepIndex[methodStep]] + pad}px`,
            },
            transition: 'height 0.5s',
        }}>
            <TransitionBox absolute enabled={methodStep == 'family'}>
                <FamilyPage />
            </TransitionBox>
            <TransitionBox absolute enabled={methodStep == 'num_winners'}>
                <NumWinnersPage />
            </TransitionBox>
            <TransitionBox absolute enabled={methodStep == 'method'}>
                <VotingMethodPage />
            </TransitionBox>
        </Box>
    </Box>;
});

export default VotingMethodSelector;
