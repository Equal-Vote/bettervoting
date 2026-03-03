import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import useElection from "~/components/ElectionContextProvider";
import Widget from "./Widget";
import useRace from "~/components/RaceContextProvider";
import { useState } from "react";
import { Box, Divider, MenuItem, Select, Typography } from "@mui/material";
import { CHART_COLORS, methodValueToTextKey } from "~/components/util";
import { Candidate } from "@equal-vote/star-vote-shared/domain_model/Candidate";
import HeadToHeadChart from "./HeadToHeadChart";
import ResultsKey from "./ResultsKey";
import { candidate } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

interface IMatchup {
    name: string
    leftVotes: number
    rightVotes: number,
    equalPreferences: {name: string, count: number}[]
}

// candidates helps define the order
const HeadToHeadWidget = () => {
    const {t} = useElection();
    const {race, results} = useRace();
    const candidates = results.summaryData.candidates;
    const [refCandidateId, setRefCandidateId] = useState(candidates[0].id);

    const refCandidate = candidates.find(c => c.id == refCandidateId);
    const matchups: {[key: string]:IMatchup} = {};
    candidates.forEach((c) => {
        if(c.id == refCandidateId) return;
        matchups[c.id] = {
            name: c.name,
            leftVotes: refCandidate.votesPreferredOver[c.id],
            rightVotes: c.votesPreferredOver[refCandidate.id],
            equalPreferences: [] 
        }
    });

    let wins = 0;
    let losses = 0;

    Object.values(matchups).forEach(m => {
        if(m.leftVotes > m.rightVotes) wins++;
        if(m.leftVotes < m.rightVotes) losses++;
    })

    const methodKey = methodValueToTextKey[race.voting_method];

    return <Widget title={t('results_ext.head_to_head_title')} wide>
        <Select
            value={refCandidateId}
            label={t('results_ext.candidate_selector')}
            onChange={(e) => setRefCandidateId(e.target.value as string)}
        >
            {candidates.map((c, i) => <MenuItem key={i} value={c.id}>{c.name}</MenuItem>)}
        </Select>
        <Divider variant='middle' sx={{width: '100%', m: 3}}/>
        <Typography variant='h6'>{refCandidate.name} won {wins} matchups, and lost {losses}.</Typography>
        <Box display='flex' flexDirection='column' gap={4} sx={{my: 3, width: '100%', overflowY: {xs: 'unset', md: 'scroll'}, maxHeight: {xs: 'unset', md: '750px'}}}>
            {candidates.filter(c => c.id != refCandidateId).map((c,i) => {
                const m = matchups[c.id];
                return <HeadToHeadChart
                    key={i}
                    leftName={refCandidate.name} rightName={m.name}
                    leftVotes={m.leftVotes} rightVotes={m.rightVotes}
                    total={results.summaryData.nTallyVotes}
                    equalContent={
                        (race.voting_method == 'IRV' || race.voting_method == 'STV')?
                        {
                            title: 'No Preferences',
                            description: `These voters didn't rank either candidate`
                        }
                        :
                        {
                            title: 'Distribution of Equal Support',
                            description: m.equalPreferences
                        }
                    }
                />
            })}
        </Box>
        <ResultsKey items={[
            [CHART_COLORS[0], t(`results_ext.head_to_head_key.${methodKey}.higher`, {name: refCandidate.name, other_name: t('results_ext.head_to_head_other_name')})],
            ['var(--brand-gray-1)', t(`results_ext.head_to_head_key.${methodKey}.equal`)],
            [CHART_COLORS[1], t(`results_ext.head_to_head_key.${methodKey}.higher`, {name: t('results_ext.head_to_head_other_name'), other_name: refCandidate.name})],
        ]} />
    </Widget>
}

export default HeadToHeadWidget;