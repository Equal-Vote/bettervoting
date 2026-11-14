import { Box, Typography } from "@mui/material"
import useRace from "~/components/RaceContextProvider";
import { Tip } from "~/components/styles";
import { CHART_COLORS } from "~/components/util";

const HeadToHeadChart = (
    {leftOnly, leftName, rightName, leftVotes, rightVotes, total, equalContent} :
    { leftOnly?: boolean, leftName: string, rightName: string, leftVotes: number, rightVotes: number, total: number, equalContent?: {title: string, description: string | {name: string, count: number}[]}}
) => {
    const {race} = useRace();
    // With no votes at all there's nothing to divide by; treat every share as 0 rather than NaN
    const share = (votes: number) => total > 0 ? votes / total : 0;
    const leftValue = share(leftVotes);
    const midVotes = (total - leftVotes - rightVotes)
    const midValue = share(midVotes);
    const rightValue = share(rightVotes);
    const leftPercent = `${Math.round(leftValue*100)}%`;
    const rightPercent = `${Math.round(rightValue*100)}%`;
    const midPercent = `${Math.round(midValue*100)}%`;
    // The star marks the winner of a head-to-head; a single-sided chart has nothing to win against
    const leftWins = !leftOnly && leftValue > rightValue;
    const rightWins = !leftOnly && rightValue > leftValue;
    // Single-sided with nothing on the left yet: say "0%" in the empty bar instead of showing nothing
    const showEmptyLeft = leftOnly && leftValue === 0;

    const formatEqualPreference = (arr) => {
        return <>{(race.voting_method == 'RankedRobin'? arr : arr.toReversed())
            .map(e => {
                const n = Math.round(20*e.count/midVotes)
                const p = [...new Array(n)].map(() => '█').join('')+' '+Math.round(100*e.count/midVotes)+'%';
                if(race.voting_method == 'STAR' || race.voting_method == 'STAR_PR')
                    return `${e.name} ⭐: ${p}`
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
        <Box sx={{ mb: 1, display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 2 }}>
            <Typography sx={{textAlign: 'left', fontWeight: 'bold'}}>{leftName}</Typography>
            {!leftOnly && <Typography sx={{textAlign: 'right', fontWeight: 'bold'}}>{rightName}</Typography>}
        </Box>
        <Box sx={{ height: "38px", display: "flex", flexDirection: "row" }}>
            {leftValue > 0 &&
                <Box sx={{ backgroundColor:CHART_COLORS[0], textAlign: 'left', pt: 1, pl: 1, fontSize: '1rem', overflow: 'visible', zIndex: 1, width: leftPercent }}>
                    {leftWins ? '⭐ ' : ''}{leftPercent}
                </Box>
            }
            {midValue > 0 && <>
                {equalContent && 
                    <Tip content={{
                        title: equalContent.title,
                        description: Array.isArray(equalContent.description) ? formatEqualPreference(equalContent.description) : equalContent.description
                    }}>
                    <Box sx={{ backgroundColor: 'var(--brand-gray-1)', pt: 1, pl: showEmptyLeft ? 1 : 0, fontSize: showEmptyLeft ? '1rem' : undefined, width: midPercent }}>
                        {showEmptyLeft && leftPercent}
                        {!leftOnly && ((midValue < .1 || midValue + leftValue < .2 || midValue + rightValue < .2) ? '' : midPercent)}
                    </Box>
                    </Tip>
                }
                {!equalContent &&
                    <Box sx={{ backgroundColor:'var(--brand-gray-1)', pt: 1, pl: showEmptyLeft ? 1 : 0, fontSize: showEmptyLeft ? '1rem' : undefined, width: midPercent }}>
                        {showEmptyLeft && leftPercent}
                        {!leftOnly && ((midValue < .1 || midValue+leftValue < .2 || midValue+rightValue < .2)? '' : midPercent)}
                    </Box>
                }
            </>}
            {rightValue > 0 &&
                <Box sx={{ backgroundColor:CHART_COLORS[1], textAlign: 'right', pt: 1, pr: 1, fontSize: '1rem', width: rightPercent }}>
                    {rightWins ? '⭐ ' : ''}{rightPercent}
                </Box>
            }
        </Box>
    </Box>
}

export default HeadToHeadChart;