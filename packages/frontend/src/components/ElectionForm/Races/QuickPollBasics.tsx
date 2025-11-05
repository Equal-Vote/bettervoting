import { TermType } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings"
import { Box, Typography, RadioGroup, FormControlLabel, capitalize, Radio, Divider } from "@mui/material"
import useElection from "~/components/ElectionContextProvider";
import { Tip } from "~/components/styles"
import { TransitionBox } from "~/components/util";

export default ({multiRace, setMultiRace}) => {
    const {election, updateElection, t} = useElection();
    return <Box display='flex' flexDirection='column' justifyContent='flexStart' alignItems='left' sx={{ m: 0, p: 2, mb: 10 }} gap={10}>
        <Box>
            <Typography sx={{textAlign: 'left'}}>
                {t('election_creation.term_question')}
                <Tip name='polls_vs_elections' />
            </Typography>
            <RadioGroup row>
                {['election', 'poll'].map((type, i) =>
                    <FormControlLabel
                        key={i}
                        value={capitalize(t(`keyword.${type}.election`))}
                        control={<Radio />}
                        label={capitalize(t(`keyword.${type}.election`))}
                        onClick={() => updateElection(e => { e.settings.term_type = type as TermType })}
                        checked={election.settings.term_type === type}
                    />
                )}
            </RadioGroup>
        </Box>

        <TransitionBox enabled={election.settings.term_type !== undefined}>
            <Typography sx={{textAlign: 'left'}}>
                {t('election_creation.multi_race_question')}
            </Typography>
            <RadioGroup row>
                {['single_race', 'multi_race'].map((type, i) =>
                    <FormControlLabel
                        key={i}
                        value={capitalize(t(`election_creation.${type}`))}
                        control={<Radio />}
                        label={capitalize(t(`election_creation.${type}`))}
                        onClick={() => setMultiRace(type === 'multi_race')}
                        checked={(type === 'multi_race') === multiRace}
                    />
                )}
            </RadioGroup>
        </TransitionBox>
    </Box>
}