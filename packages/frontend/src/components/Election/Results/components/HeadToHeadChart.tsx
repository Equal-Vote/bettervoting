import { Box, Typography } from "@mui/material"
import useRace from "~/components/RaceContextProvider";
import { Tip } from "~/components/styles";
import { CHART_COLORS } from "~/components/util";

const HeadToHeadChart = (
    {leftName, rightName, leftVotes, rightVotes, total, equalContent} :
    {leftName: string, rightName: string, leftVotes: number, rightVotes: number, total: number, equalContent?: {title: string, description: string | {name: string, count: number}[]}}
) => {
    const {race} = useRace();
    const leftValue = leftVotes / total;
    const midVotes = (total - leftVotes - rightVotes)
    const midValue = midVotes / total;
    const rightValue = rightVotes / total;
    const leftPercent = `${Math.round(leftValue*100)}%`;
    const rightPercent = `${Math.round(rightValue*100)}%`;
    const midPercent = `${Math.round(midValue*100)}%`;

    const formatEqualPreference = (arr) => {
        return <>{(race.voting_method == 'RankedRobin'? arr : arr.toReversed())
            .map(e => {
                const n = Math.round(20*e.count/midVotes)
                const p = [...new Array(n)].map(() => '█').join('')+' '+Math.round(100*e.count/midVotes)+'%';
                if(race.voting_method == 'STAR' || race.voting_method == 'STAR_PR')
                    return `${e.name}⭐: ${p}`
                if(race.voting_method == 'Approval')
                    return <>
                        {(e.name == '1') ? [...new Array(4)].map(() => <>&nbsp;</>) : ''}
                        {(e.name == '1' ? 'Approve' : 'Disapprove')}
                        {`: ${p}`}
                    </>
                return `${e.name}: ${p}`
            }).map(e => <>{e}<br/></>)
        }</>
    }

    return <Box sx={{mx:4, width: '100%', maxWidth: '540px', margin: 'auto'}}>
        <Box display='flex' flexDirection='row' justifyContent='space-between' sx={{mb: 1}} gap={2}>
            <Typography sx={{textAlign: 'left', fontWeight: 'bold'}}>{leftName}</Typography>
            <Typography sx={{textAlign: 'right', fontWeight: 'bold'}}>{rightName}</Typography>
        </Box>
        <Box height='38px' display='flex' flexDirection='row'>
            {leftValue > 0 &&
                <Box width={leftPercent} sx={{backgroundColor:CHART_COLORS[0], textAlign: 'left', pt: 1, pl: 1, fontSize: '1rem', overflow: 'visible', zIndex: 1}}>
                    {(leftValue > rightValue)? '⭐ ': ''}{leftPercent}
                </Box>
            }
            {midValue > 0 && <>
                {equalContent && 
                    <Tip content={{
                        title: equalContent.title,
                        description: Array.isArray(equalContent.description) ? formatEqualPreference(equalContent.description) : equalContent.description
                    }}>
                        <Box width={midPercent} sx={{backgroundColor:'var(--brand-gray-1)', pt: 1}}>
                            {(midValue < .1 || midValue+leftValue < .2 || midValue+rightValue < .2)? '' : midPercent}
                        </Box>
                    </Tip>
                }
                {!equalContent &&
                    <Box width={midPercent} sx={{backgroundColor:'var(--brand-gray-1)', pt: 1}}>
                        {(midValue < .1 || midValue+leftValue < .2 || midValue+rightValue < .2)? '' : midPercent}
                    </Box>
                }
            </>}
            {rightValue > 0 &&
                <Box width={rightPercent} sx={{backgroundColor:CHART_COLORS[1], textAlign: 'right', pt: 1, pr: 1, fontSize: '1rem'}}>
                    {(rightValue > leftValue)? '⭐ ': ''}{rightPercent}
                </Box>
            }
        </Box>
    </Box>
}

export default HeadToHeadChart;