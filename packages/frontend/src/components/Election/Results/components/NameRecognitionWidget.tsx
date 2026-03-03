import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import Widget from "./Widget";
import useRace from "~/components/RaceContextProvider";
import { Typography } from "@mui/material";
import ResultsBarChart from "./ResultsBarChart";
import useFeatureFlags from "~/components/FeatureFlagContextProvider";

// candidates helps define the order
const NameRecognitionWidget = () => {
    const {ballotsForRace} = useAnonymizedBallots();
    const {t, race} = useRace();

    const flags = useFeatureFlags();
    if(!flags.isSet('ALL_STATS')) return <></>

    const numActive = Object.fromEntries(race.candidates.map(c => [c.candidate_id, {
        name: c.candidate_name,
        count: 0,
    }]))

    const b = ballotsForRace()
    b.forEach((scores) => {
        scores.forEach(score => {
            if(score.score == null || score.score == undefined) return;
            numActive[score.candidate_id].count++;
        })
    })

    return <Widget title={t(`results_ext.name_recognition_title`)}>
        <Typography variant='h6'>{t(`results_ext.name_recognition_sub_title`)}</Typography>
        <ResultsBarChart data={Object.values(numActive)} xKey='count' percentage={true} percentDenominator={b.length}/>
        <Typography>{t(`results_ext.name_recognition_blank_warning`)}</Typography>
    </Widget>
}

export default NameRecognitionWidget;