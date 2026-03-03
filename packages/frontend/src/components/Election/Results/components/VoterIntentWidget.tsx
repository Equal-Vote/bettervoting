import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import useElection from "~/components/ElectionContextProvider";
import Widget from "./Widget";
import useRace from "~/components/RaceContextProvider";
import { Box, Typography } from "@mui/material";
import ResultsPieChart from "./ResultsPieChart";
import { candidate, irvResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

// eliminationOrder is an array of candidateIds
const VoterIntentWidget = () => {
    const {t} = useElection();
    let { results, race } = useRace();
    const { ballotsForRace} = useAnonymizedBallots();

    results = results as irvResults;

    const candidates = results.summaryData.candidates;

    let [winner, runnerUp] = candidates.slice(0, 2);

    const final_round_candidates = candidates.filter(c => c.hareScores.at(-1) != 0).length;
    if(final_round_candidates > 2){
        runnerUp = {...runnerUp, name: 'a losing candidate'}
    }

    const condorcetCandidate = candidates.find(c => candidates.every(c2 => c.id == c2.id || c.winsAgainst[c2.id]))

    // End note: Add asterisk and change to: "*In some elections, the uncounted rankings could have made a difference in the race if they had been counted."
    //     if the Condorcet winner won,  If the Condorcet winner lost change end note to say "In this election, the uncounted rankings could have made a
    //     difference. Looking at the full ballot data, voters preferred x over all other candidates.
    const data = [
        { // Type 1: !hasPassedOver && isWinner
            name: `Voter's vote went to ${winner.name}. Rankings for all candidates preferred over ${winner.name} were counted`,
            votes: 0,
            color: 'var(--ltbrand-green)'
        },
        { // Type 2: !hasPassedOver && !isWinner && !trailingRanks
            name: `Voter didn't support ${winner.name} but all their preferences were still counted`,
            votes: 0,
            color: 'var(--ltbrand-lime)'
        },
        { // Type 3:  hasPassedOver
            name: "Vote couldn't transfer to next choice after an elimination because next choice was already eliminated",
            votes: 0,
            color: 'var(--ltbrand-red)'
        },
        { // Type 4: !hasPassedOver && !isWinner && trailingRanks
            name: `Vote was counted towards ${runnerUp.name}, and some of the voter's rankings were not counted at all.*`,
            votes: 0,
            color: 'var(--brand-orange)'
        },
    ];

    const b = ballotsForRace();
    let numBallots = b.length;
    let numPref = 0;
    let numIgnored = 0;
    b.map((scores) => {
        const ranksLeft = scores
            .filter(s => s.score != null)
            .sort((a, b) => a.score - b.score);
        
        numPref += ranksLeft.length;

        if(ranksLeft.length == 0){
            numBallots--;
            return;
        }
        const cs = race.candidates;
        // keeping this variable so we have an easy way to debug
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const loggedBallot = ranksLeft.map(s => ({score: s.score, name: cs.find(c => c.candidate_id == s.candidate_id).candidate_name, id: s.candidate_id}))

        let hasPassedOver = false;
        const alreadyEliminated = []

        candidates.reverse().forEach((c) => {
            if(ranksLeft.length == 0) return;
            if(ranksLeft[0].candidate_id == c.id){
                ranksLeft.shift();
                while(ranksLeft.length > 0 && alreadyEliminated.includes(ranksLeft[0].candidate_id)){
                    hasPassedOver = true; 
                    numIgnored++;
                    ranksLeft.shift();
                }
            }
            alreadyEliminated.push(c);
        })

        const trailingRanks = ranksLeft.length > 1;
        const isWinner = ranksLeft.length > 0 && ranksLeft[0].candidate_id == winner.id;

        numIgnored += ranksLeft.length-1;

        // loserWithTrailingRanks = !isWinner && trailingRanks
        const ballotType = () => {
            // Type 1: !hasPassedOver && isWinner
            // Type 2: !hasPassedOver && !isWinner && !trailingRanks
            // Type 3:  hasPassedOver
            // Type 4: !hasPassedOver && !isWinner && trailingRanks
            if(hasPassedOver) return 3;
            if(isWinner) return 1;
            if(trailingRanks) return 4;
            return 2;
        }
        data[ballotType()-1].votes++;
    })

    const Definition = ({i}: {i: number}) => <Box key={i} sx={{width: '100%', mb: 2}}>
        <Box display='flex' flexDirection='row' alignContent='stretch' sx={{justifyContent: 'flex-start'}} >
            <Box sx={{
                mr: 1,
                width: '15px',
                my: 0,
                backgroundColor: data[i].color
            }}/>
            <Box display='flex' justifyContent='space-between' gap={1} flexDirection='column'>
                <Typography sx={{textAlign: 'left'}}>{data[i].name}</Typography>
            </Box>
        </Box>
    </Box>

    return <Widget title={t('results_ext.voter_intent_title')} wide>
        <Typography sx={{textAlign: 'left'}}>
            In Ranked Choice there&apos;s a common misconception that &quot;If your favorite doesn&apos;t win, your next choice will be counted&quot; but that didn&apos;t
            happen for {Math.round(100*(data[2].votes+data[3].votes)/numBallots)}% of the voters. {Math.round(100*numIgnored / numPref)}%
            of voter&apos;s rankings were uncounted in this election.
        </Typography>
        <Box width={'250px'}> {/*Limiting the width so that the hover experience is less awkward*/}
            <ResultsPieChart data={[0, 1, 3, 2].map(i => data[i])} noLegend />
        </Box>
        <Box sx={{maxWidth: '650px', mx: 'auto'}}>
            <Box sx={{width: '100%'}}>
                <Typography sx={{textAlign: 'left', mb: 1}}><b>Intent respected: Vote transferred as intended</b></Typography>
            </Box>
            {[0,1].map(i => <Definition key={i} i={i}/>)}
            <Box sx={{width: '100%', mt: 2}}>
                <Typography sx={{textAlign: 'left', mb: 1}}><b>Intent not respected: Vote didn&apos;t transfer as intended</b></Typography>
            </Box>
            {[2,3].map(i => <Definition key={i} i={i}/>)}
        </Box>
        <Typography sx={{textAlign: 'left', mt: 2}}><b>*</b>
            {(condorcetCandidate === undefined || condorcetCandidate.id === winner.id) &&
            'In some elections, the uncounted rankings could have made a difference and changed the winner if they had been counted.'
            }
            {condorcetCandidate !== undefined && condorcetCandidate.id !== winner.id &&
            `In this election, the uncounted rankings could have made a difference and changed the winner. Looking at the full ballot data, voters preferred ${condorcetCandidate.name} over all other candidates.`
            }
        </Typography>
    </Widget>
}
export default VoterIntentWidget;