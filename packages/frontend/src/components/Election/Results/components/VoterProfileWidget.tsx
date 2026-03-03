import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import useElection from "~/components/ElectionContextProvider";
import Widget from "./Widget";
import useRace from "~/components/RaceContextProvider";
import { useState } from "react";
import {  Divider, MenuItem, Select, Typography } from "@mui/material";
import { formatPercent } from "~/components/util";
import ResultsBarChart from "./ResultsBarChart";
import HeadToHeadChart from "./HeadToHeadChart";
import { getVoterErrorData } from "./VoterErrorStatsWidget";

// candidates helps define the order
const VoterProfileWidget = ({topScore, ranked=false} : {topScore: number, ranked?: boolean}) => {
    const {t} = useElection();
    const {ballotsForRace, ballotsForRaceWithMeta} = useAnonymizedBallots();
    const {race, results} = useRace();
    const candidates = results.summaryData.candidates;
    const [refCandidateId, setRefCandidateId] = useState(candidates[0].id);


    const refCandidate = candidates.find(c => c.id == refCandidateId);

    const [left, right] = candidates.slice(0, 2);

    const avgBallot: {[key: string]:{name, score}} = {};
    candidates.forEach((c) => {
        avgBallot[c.id] = {
            name: c.name,
            score: 0,
        }
    });

    const equalPreferences = [];

    const incIndex = (arr, index) => {
        if(index < 0) return; // Quick Hack to keep the page from crashing
        while(index >= arr.length ){
            arr.push({
                name: arr.length,
                count: 0
            });
        }
        arr[index].count++;
    }

    let totalTopScored = 0;

    const b = ballotsForRace()
    let leftVotes = 0;
    let rightVotes = 0;
    let total = 0;
    let numBullets = 0;
    b.forEach(scores => {
        const refScore = scores.find((score) => score.candidate_id == refCandidateId)?.score;
        if(refScore != topScore) return;
        if(scores.filter(score => score.score != 0 && score.score != null).length === 1) numBullets++;
        totalTopScored++;
        let [leftScore, rightScore] = [0, 0]

        let defValue = 0;
        if(ranked){
            defValue = Math.max(...scores.map(s => s.score ?? 0))+1;
        }else{
            defValue = 0;
        }
        scores.forEach(s => {
            const score = s.score ?? defValue;
            avgBallot[s.candidate_id].score += score;
            if(s.candidate_id == left.id) leftScore = score;
            if(s.candidate_id == right.id) rightScore = score;
        })

        if(ranked){
            leftScore = -leftScore;
            rightScore = -rightScore;
        }

        if(leftScore > rightScore) leftVotes++;
        if(leftScore < rightScore) rightVotes++;
        if(leftScore == rightScore) incIndex(equalPreferences, leftScore)
        total++;
    });

    const data = Object.values(avgBallot);
    data.forEach(c => c.score = Math.round(100*c.score / totalTopScored)/100);
    data.sort((a,b) => (ranked? 1 : -1)*(a.score-b.score));


    let voterErrorData = [];
    if(race.voting_method === 'IRV' || race.voting_method === 'STV'){
        const bm = ballotsForRaceWithMeta().filter(b => {
            const refScore = b.scores.find((score) => score.candidate_id == refCandidateId)?.score;
            const topScore = b.scores.reduce((prev, score) => {
                if(score.score == 0 || score.score == null) return prev;
                return Math.min(prev, score.score);
            }, Infinity);
            return refScore == topScore;
        });
        voterErrorData = getVoterErrorData(bm);
    }

    return <Widget title={t('results_ext.voter_profile_title')} wide>
        {/*<Typography>Average ballot for voters who gave</Typography>*/}
        <Select
            value={refCandidateId}
            label={t('results_ext.candidateSelector')}
            onChange={(e) => setRefCandidateId(e.target.value as string)}
        >
            {candidates.map((c, i) => <MenuItem key={i} value={c.id}>{c.name}</MenuItem>)}
        </Select>
        <Typography variant='h6'>{t('results_ext.voter_profile_count', {count: totalTopScored, name: refCandidate.name})}</Typography>
        <Divider variant='middle' sx={{width: '100%', m:1}}/>
        <Typography variant='h6'>{t('results_ext.voter_profile_preferred_frontrunner', {name: refCandidate.name})}</Typography>
        {totalTopScored == 0 ? 'n/a' : <HeadToHeadChart 
            leftName={left.name}
            rightName={right.name}
            leftVotes={leftVotes}
            rightVotes={rightVotes}
            total={total}
            equalContent={{
                title: 'Distribution of Equal Support',
                description: equalPreferences
            }}
        />}
        <Divider variant='middle' sx={{width: '100%', m:1}}/>
        <Typography variant='h6'>{t(`results_ext.voter_profile_average_${ranked? 'ranks' : 'scores'}`, {name: refCandidate.name})}</Typography>
        {totalTopScored == 0 ? 'n/a' : <>
            <Typography>{`${formatPercent(numBullets/totalTopScored)} of ${refCandidate.name} supporters did not vote for any other candidate`}</Typography>
            <ResultsBarChart data={data} xKey='score' percentage={false}/>
        </>}
        {(race.voting_method === 'IRV' || race.voting_method === 'STV') && <>
            <Divider variant='middle' sx={{width: '100%', m:1}}/>
            <Typography variant='h6'>{t(`results_ext.voter_profile_error_rates`, {name: refCandidate.name})}</Typography>
            <ResultsBarChart data={voterErrorData} xKey='votes' percentage/>
            <Typography>Ballots with errors can still be counted in most cases, but it&apos;s a useful measure of the voter&apos;s understanding</Typography>
        </>}
    </Widget>
}

export default VoterProfileWidget;