import { Edit, ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, Button, FormControlLabel, FormHelperText, IconButton, Radio, RadioGroup, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import { AddIcon, methodValueToTextKey, TransitionBox, useSubstitutedTranslation } from "~/components/util"
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
    const [methodStep, innerSetMethodStep] = useState<MethodStep>(editedRace.voting_method == undefined? 'unset' : 'done');
    // I have to have a non-undefined default to avoid warnings that slow down the UI
    const [inputtedWinners, setInputtedWinners] = useState(String(editedRace.num_winners ?? 1));
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
        setErrors({...errors, votingMethod: ''})
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
        setTimeout(() => {
            innerSetMethodStep(step)
        }, 100);
    }

    const MethodBullet = ({ value, disabled }: { value: string, disabled: boolean }) => <>
        <FormControlLabel value={value} disabled={disabled} control={
            <Radio onClick={() => setMethodStep('done')}/>
        } label={t(`edit_race.methods.${methodValueToTextKey[value]}.title`)} sx={{ mb: 0, pb: 0 }} />
        <FormHelperText sx={{ pl: 4, mt: -1 }}>
            {t(`edit_race.methods.${methodValueToTextKey[value]}.description`)}
        </FormHelperText>
    </>

    const FamilyPage = () => <>
        <Typography id="num-winners-label" gutterBottom component="p">
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
        <Box display='flex' flexDirection='row' gap={3} sx={{width: '100%'}}>
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
                    my: 1,
                }}
                onChange={(e) => {
                    setInputtedWinners(e.target.value);

                    if(e.target.value == '' || parseInt(e.target.value) < 1){
                        return;
                    }

                    if(e.target.value != '') applyRaceUpdate(race => { race.num_winners =  parseInt(e.target.value) });
                }}
            />
        </Box>
        <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1} sx={{width: '100%'}}>
            <SecondaryButton onClick={() => {
                setMethodStep('family')
            }}>Back</SecondaryButton>
            <PrimaryButton disabled={inputtedWinners == '' || parseInt(inputtedWinners) < 1} onClick={() => {
                setMethodStep('method')
            }}>Next</PrimaryButton>
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

    const pad = 0; // 30 // may add this back later

    return <Box>
        <Button
            // it's hacky, but opacity 0.8 does helps take the edge off the bold a bit
            sx={{mr: "auto", textDecoration: 'none', textTransform: 'none', color: 'black', fontSize: '1.125rem', opacity: 0.86, textAlign: 'left'}}
            disabled={methodStep != 'unset' && methodStep != 'done'}
            onClick={() => setMethodStep('family')}
        >
            {methodStep == 'done' && <EditIcon sx={{scale: 1, mr: 1}}/>}
            {methodStep != 'done' ? <>
                <AddIcon prefix/> Voting Method
            </> : <>
                {editedRace.voting_method == undefined ? '___' : t(`methods.${methodValueToTextKey[editedRace.voting_method]}.full_name`)} with&nbsp;
                {editedRace.num_winners == undefined ? '___' : editedRace.num_winners}&nbsp;
                {methodFamily == undefined || methodFamily == 'single_winner' ? '' : <>{t(`edit_race.${methodFamily}_adj`)}&nbsp;</>}
                {methodFamily == 'single_winner'? 'winner' : 'winners'}
            </>}
        </Button>
        <FormHelperText error sx={{ pl: 1}}>
            {errors.votingMethod}
        </FormHelperText>

        <Box sx={{
            position: 'relative',
            height: `${[0, 180, 122, showAllMethods? 407 : 287, -pad][stepIndex[methodStep]]+pad}px`,
            transition: 'height 0.5s',
        }}>
            <TransitionBox absolute enabled={methodStep == 'family'}>
                <FamilyPage/>
            </TransitionBox>
            <TransitionBox absolute enabled={methodStep == 'num_winners'}>
                <NumWinnersPage/>
            </TransitionBox>
            <TransitionBox absolute enabled={methodStep == 'method'}>
                <VotingMethodPage/>
            </TransitionBox>
        </Box>
    </Box>
}