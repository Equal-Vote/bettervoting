import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, Button, FormControlLabel, FormHelperText, IconButton, Radio, RadioGroup, TextField, Typography } from "@mui/material"
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import { methodValueToTextKey, useSubstitutedTranslation } from "~/components/util"

export default ({election, editedRace, isDisabled, setErrors, errors}) => {
    const { t } = useSubstitutedTranslation();
    const PR_METHODS = ['STV', 'STAR_PR'];
    const [methodStep, innerStepMethodStep] = useState(0);//editedRace.voting_method == undefined? 0 : 3);
    const [inputtedWinners, setInputtedWinners] = useState(String(editedRace.num_winners));
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

    const setMethodStep = (n) => {
        if(n < 1) setMethodFamily(undefined);
        if(n < 2) editedRace.num_winners = undefined;
        if(n < 3){
            setShowAllMethods(false);
            editedRace.voting_method = undefined;
        }
        innerStepMethodStep(n);
    }

    const MethodBullet = ({ value, disabled }: { value: string, disabled: boolean }) => <>
        <FormControlLabel value={value} disabled={disabled} control={<Radio onClick={() => setMethodStep(3) }/>} label={t(`edit_race.methods.${methodValueToTextKey[value]}.title`)} sx={{ mb: 0, pb: 0 }} />
        <FormHelperText sx={{ pl: 4, mt: -1 }}>
            {t(`edit_race.methods.${methodValueToTextKey[value]}.description`)}
        </FormHelperText>
    </>

    const makeMethodStepSX = (n) => ({
        opacity: methodStep == n ? 1 : 0,
        top: methodStep == n? 0 : ((methodStep < n) ? 20 : -20),
        pointerEvents: methodStep == n? 'auto' : 'none',
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
                if (e.target.value == 'single') {
                    setErrors({ ...errors, raceNumWinners: '' })
                    editedRace.num_winners = 1;
                }
                setMethodFamily(e.target.value)
            }}
        >
            <FormControlLabel
                value="single_winner"
                disabled={isDisabled}
                control={<Radio />}
                label={t('edit_race.single_winner')}
                sx={{ mb: 0, pb: 0 }}
                onClick={() => {
                    editedRace.num_winners = 1;
                    setMethodStep(2)
                }}
            />
            <FormControlLabel
                value="bloc_multi_winner"
                disabled={isDisabled}
                control={<Radio />}
                label={t('edit_race.bloc_multi_winner')}
                sx={{ mb: 0, pb: 0 }}
                onClick={() => {
                    editedRace.num_winners = Math.max(2, editedRace.num_winners)
                    setMethodStep(1)
                }}
            />
            <FormControlLabel
                value="proportional_multi_winner"
                disabled={isDisabled}
                control={<Radio />}
                label={t('edit_race.proportional_multi_winner')}
                sx={{ mb: 0, pb: 0 }}
                onClick={() => {
                    if (!PR_METHODS.includes(editedRace.voting_method)) editedRace.voting_method = undefined;
                    editedRace.num_winners = Math.max(2, editedRace.num_winners)
                    setMethodStep(1)
                }}
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
                value={editedRace.num_winners}
                sx={{
                    p: 0,
                    boxShadow: 2,
                    width: '100px',
                }}
                onChange={(e) => {
                    setErrors({ ...errors, raceNumWinners: '' })
                    setInputtedWinners(e.target.value);

                    if(e.target.value != '') editedRace.num_winners =  parseInt(e.target.value)
                }}
            />
        </Box>
        <FormHelperText error sx={{ pl: 1, pt: 0 }}>
            {errors.raceNumWinners}
        </FormHelperText>
        <Box display='flex' flexDirection='row' justifyContent='flex-end' gap={1}>
            <SecondaryButton onClick={() => {
                setMethodStep(0)
            }}>Back</SecondaryButton>
            <PrimaryButton onClick={() => setMethodStep(2)}>Next</PrimaryButton>
        </Box>
    </>

    const VotingMethodPage = () => <>
        <Typography>Which Voting Method?</Typography>
        <RadioGroup
            aria-labelledby="voting-method-radio-group"
            name="voter-method-radio-buttons-group"
            value={editedRace.voting_method}
            onChange={(e) => editedRace.voting_method = e.target.value}
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
                setMethodStep(m => methodFamily === 'single_winner' ? 0 : 1)
            }}>Back</SecondaryButton>
        </Box>
    </>

    const pad = 30;

    return <>
        <Typography gutterBottom variant="h6" component="h6">Voting Method</Typography>

        <Button
            sx={{ margin: 'auto', textTransform: 'none'}}
            disabled={methodStep < 3}
            onClick={() => setMethodStep(0)}
        >
            {editedRace.voting_method == undefined ? '___' : t(`methods.${methodValueToTextKey[editedRace.voting_method]}.full_name`)} with&nbsp;
            {methodFamily == 'single_winner' ? '1' : <>
                {(editedRace.num_winners == undefined ? '___' : editedRace.num_winners)}&nbsp;
                {methodFamily == undefined ? '___' : t(`edit_race.${methodFamily}_adj`)}
            </>}&nbsp;
            {methodFamily == 'single_winner'? 'winner' : 'winners'}
        </Button>
        
        <Box sx={{
            position: 'relative',
            height: `${[180, 122, showAllMethods? 407 : 287, -pad][methodStep]+pad}px`,
            transition: 'height 0.5s',
            display: 'flex', justifyContent: 'center'
        }}>
            <Box sx={makeMethodStepSX(0)}> <FamilyPage/> </Box>
            <Box sx={makeMethodStepSX(1)}> <NumWinnersPage/> </Box>
            <Box sx={makeMethodStepSX(2)}> <VotingMethodPage/> </Box>
        </Box>
        
    </>
}