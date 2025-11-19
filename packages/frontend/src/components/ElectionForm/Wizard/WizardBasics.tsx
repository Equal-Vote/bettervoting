import { TermType } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings"
import { Box, Typography, RadioGroup, FormControlLabel, capitalize, Radio, Divider } from "@mui/material"
import useElection from "~/components/ElectionContextProvider";
import { Tip } from "~/components/styles"
import { scrollToElement, TransitionBox } from "~/components/util";
import { RACE_FORM_GAP } from "../Races/RaceForm";

export default ({multiRace, setMultiRace}) => {
    const {election, updateElection, t} = useElection();
    return <Box display='flex' flexDirection='column' justifyContent='flexStart' alignItems='left' sx={{ m: 0, p: 1, mb: RACE_FORM_GAP}} gap={RACE_FORM_GAP}>
        <Box>
            <Typography sx={{textAlign: 'left'}}>
                {t('wizard.term_question')}
                <Tip name='polls_vs_elections' />
            </Typography>
            <RadioGroup row>
                {['election', 'poll'].map((type) =>
                    <FormControlLabel
                        key={type}
                        value={capitalize(t(`keyword.${type}.election`))}
                        control={<Radio />}
                        label={capitalize(t(`keyword.${type}.election`))}
                        onClick={() => {
                            scrollToElement(document.querySelector(`.wizard`));
                            updateElection(e => { e.settings.term_type = type as TermType })
                        }}
                        checked={election.settings.term_type === type}
                    />
                )}
            </RadioGroup>
        </Box>

        <TransitionBox enabled={election.settings.term_type !== undefined}>
            <Typography sx={{textAlign: 'left'}}>
                {t('wizard.multi_race_question')}
            </Typography>
            <RadioGroup row>
                {['single_race', 'multi_race'].map((type, i) =>
                    <FormControlLabel
                        key={i}
                        value={capitalize(t(`wizard.${type}`))}
                        control={<Radio />}
                        label={capitalize(t(`wizard.${type}`))}
                        onClick={() => setMultiRace(type === 'multi_race')}
                        checked={(type === 'multi_race') === multiRace}
                    />
                )}
            </RadioGroup>
        </TransitionBox>
    </Box>
}