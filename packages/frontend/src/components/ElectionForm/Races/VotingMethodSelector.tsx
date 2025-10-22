import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, Button, FormControlLabel, FormHelperText, IconButton, Radio, RadioGroup, TextField, Typography } from "@mui/material"
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import { methodValueToTextKey, useSubstitutedTranslation } from "~/components/util"
import EditIcon from '@mui/icons-material/Edit';

type MethodStep = 'unset' | 'family' | 'num_winners' | 'method' | 'done';
const stepIndex = {
    'unset': 0,
    'family': 1,
    'num_winners': 2,
    'method': 3,
    'done': 4
};

export default ({election, editedRace, isDisabled, setErrors, errors, applyRaceUpdate}) => {
    const { t } = useSubstitutedTranslation();
    const PR_METHODS = ['STV', 'STAR_PR'];
    const [methodStep, innerStepMethodStep] = useState<MethodStep>(editedRace.voting_method == undefined? 'unset' : 'done');
    // I have to have a non-undefined default to avoid warnings that slow down the UI
    const [inputtedWinners, setInputtedWinners] = useState(String(editedRace.num_winners) ?? 1);
    const [showAllMethods, setShowAllMethods] = useState(false)
    const [methodFamily, setMethodFamily] = useState(
        editedRace.voting_method == undefined ? 
            undefined
        : (
            editedRace.num_winners == 1 ?
                'single_winner'
                : (
                    PR_METHODS.includes(editedRace.voting_method) ?
                        'proportional_multi_winner'
                        :
                        'bloc_multi_winner'
                )
        )
    )

    const setMethodStep = (step: MethodStep) => {
        applyRaceUpdate(race => {
            if(step == 'unset' || step == 'family'){
                race.num_winners = undefined;
                setMethodFamily(undefined);
                setInputtedWinners('');
            }
            if(step == 'unset' || step == 'family' || step == 'num_winners' || step == 'method'){
                race.voting_method = undefined;
                setShowAllMethods(false);
            }
        });
        setTimeout(() => innerStepMethodStep(step), 100);
    }

    const MethodBullet = ({ value, disabled }: { value: string, disabled: boolean }) => <>
        <FormControlLabel value={value} disabled={disabled} control={
            <Radio onClick={() => setMethodStep('done') }/>
        } label={t(`edit_race.methods.${methodValueToTextKey[value]}.title`)} sx={{ mb: 0, pb: 0 }} />
        <FormHelperText sx={{ pl: 4, mt: -1 }}>
            {t(`edit_race.methods.${methodValueToTextKey[value]}.description`)}
        </FormHelperText>
    </>

    const makeMethodStepSX = (step: MethodStep) => ({
        opacity: methodStep == step ? 1 : 0,
        top: methodStep == step ? 0 : ((stepIndex[methodStep] < stepIndex[step]) ? 20 : -20),
        pointerEvents: methodStep == step ? 'auto' : 'none',
        transition: 'opacity 0.2s, top 0.2s',
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        gap: 1
    })

    const FamilyPage = () => <>
        <Typography id="num-winners-label" gutterBottom component="p" sx={{ marginTop: 2 }}>
            Single-Winner or Multi-Winner?
        </Typography>
        <RadioGroup
            aria-labelledby="method-family-radio-group"
            name="method-family-radio-buttons-group"
            value={methodFamily}
            onChange={(e) => {
                // HACK: calling setMethodStep first beacause only the final applyRaceUpdate will apply
                setMethodStep(e.target.value === 'single_winner' ? 'method' : 'num_winners');
                applyRaceUpdate(race => {
                    race.num_winners = e.target.value === 'single_winner'? 1 : 2;
                    setInputtedWinners('' + race.num_winners)
                });
                setMethodFamily(e.target.value)
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
    </>

    const NumWinnersPage = () => <>
        <Box display='flex' flexDirection='row' gap={3}>
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
                    }
                }}
                fullWidth
                value={inputtedWinners}
                sx={{
                    p: 0,
                    boxShadow: 2,
                    width: '100px',
                }}
                onChange={(e) => {
                    setErrors({ ...errors, raceNumWinners: '' })
                    setInputtedWinners(e.target.value);

                    if(e.target.value != '') applyRaceUpdate(race => { race.num_winners =  parseInt(e.target.value) });
                }}
            />
        </Box>
        <FormHelperText error sx={{ pl: 1, pt: 0 }}>
            {errors.raceNumWinners}
        </FormHelperText>
        <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1}>
            <SecondaryButton onClick={() => {
                setMethodStep('family')
            }}>Back</SecondaryButton>
            <PrimaryButton onClick={() => setMethodStep('method')}>Next</PrimaryButton>
        </Box>
    </>

    const VotingMethodPage = () => <>
        <Typography>Which Voting Method?</Typography>
        <RadioGroup
            aria-labelledby="voting-method-radio-group"
            name="voter-method-radio-buttons-group"
            value={editedRace.voting_method}
            onChange={(e) => applyRaceUpdate(race => { race.voting_method = e.target.value; })}
        >
            {methodFamily == 'proportional_multi_winner' ?
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
                sx={{ width: '100%', ml: -1 }}>
                {showAllMethods &&
                    <IconButton aria-labelledby='more-options' disabled={election.state != 'draft'} onClick={() => setShowAllMethods(false)}>
                        <ExpandMore />
                    </IconButton>}
                {!showAllMethods &&
                    <IconButton aria-label='more-options' disabled={election.state != 'draft'} onClick={() => setShowAllMethods(true) }>
                        <ExpandLess />
                    </IconButton>}
                <Typography variant="body1" id={'more-options'} >
                    More Options
                </Typography>
            </Box>
            <Box sx={{
                height: showAllMethods ? 'auto' : 0,
                opacity: showAllMethods ? 1 : 0,
                overflow: 'hidden',
                transition: 'height .4s, opacity .7s',
                textAlign: 'left', // this is necessary to keep the items under more options aligned left
            }}>
                <Box
                    display='flex'
                    justifyContent="left"
                    alignItems="center"
                    sx={{ width: '100%', pl: 4, mt: -1 }}>

                    {/*<FormHelperText >
                        These voting methods do not guarantee every voter an equally powerful vote if there are more than two candidates.
                    </FormHelperText>*/}
                </Box>


                {methodFamily == 'proportional_multi_winner' ?
                    <MethodBullet value='STV' disabled={isDisabled} />
                    : <>
                        <MethodBullet value='Plurality' disabled={isDisabled} />
                        <MethodBullet value='IRV' disabled={isDisabled} />
                    </>}
            </Box>
        </RadioGroup>
        <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1}>
            <SecondaryButton onClick={() => {
                setMethodStep(methodFamily === 'single_winner' ? 'family' : 'num_winners')
            }}>Back</SecondaryButton>
        </Box>
    </>

    const pad = 30;

    // <Typography gutterBottom variant="h6" component="h6">Choose Voting Method</Typography>
    return <>
        <Button
            variant='outlined'
            // it's hacky, but opacity 0.8 does helps take the edge off the bold a bit
            sx={{ margin: 'auto', textTransform: 'none', opacity: 0.8}}
            disabled={methodStep != 'unset' && methodStep != 'done'}
            onClick={() => setMethodStep('family')}
        >
            {methodStep == 'unset' ? <>
               {'<select voting method>'}
            </> : <>
                {editedRace.voting_method == undefined ? '___' : t(`methods.${methodValueToTextKey[editedRace.voting_method]}.full_name`)} with&nbsp;
                {editedRace.num_winners == undefined ? '___' : editedRace.num_winners}&nbsp;
                {methodFamily == undefined || methodFamily == 'single_winner' ? '' : <>{t(`edit_race.${methodFamily}_adj`)}&nbsp;</>}
                {methodFamily == 'single_winner'? 'winner' : 'winners'}
            </>}
            <EditIcon sx={{ml: 1}}/>
        </Button>

        <Box sx={{
            position: 'relative',
            height: `${[0, 180, 122, showAllMethods? 407 : 287, -pad][stepIndex[methodStep]]+pad}px`,
            transition: 'height 0.5s',
            display: 'flex',
            justifyContent: 'flex-start'
        }}>
            <Box sx={makeMethodStepSX('family')}> <FamilyPage/> </Box>
            <Box sx={makeMethodStepSX('num_winners')}> <NumWinnersPage/> </Box>
            <Box sx={makeMethodStepSX('method')}> <VotingMethodPage/> </Box>
        </Box>
    </>
}