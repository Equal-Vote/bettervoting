import { TermType } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings"
import { Box, Typography, RadioGroup, FormControlLabel, capitalize, Radio } from "@mui/material"
import useElection from "~/components/ElectionContextProvider";
import { Tip } from "~/components/styles"

export default () => {
    const {election, updateElection, t} = useElection();
    return <Box display='flex' flexDirection='column' justifyContent='center' alignItems='left'>
        <Typography>
            {t('election_creation.term_question')}
            <Tip name='polls_vs_elections' />
        </Typography>
        <RadioGroup row sx={{mx: 'auto'}}>
            {['poll', 'election'].map((type, i) =>
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
}