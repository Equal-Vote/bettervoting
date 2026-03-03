import { Box, Paper, Typography } from '@mui/material';
import { starResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import Widget from '../components/Widget';


// NOTE: we're not using filterRandomFromLogs at the moment, but we'll add the functionality back later
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STARResultDetailedStepsWidget = ({ results, rounds, t, filterRandomFromLogs}: {results: starResults, rounds: number, t: (key: string, v?: object) => any, filterRandomFromLogs: boolean }) => {

    // make log groups
    const topLogs = [
        'tabulation_logs.star.advance_to_runoff_basic',
        'tabulation_logs.star.advance_to_runoff_same_score',
        'tabulation_logs.star.advance_to_runoff_tiebreak',
        'tabulation_logs.star.runoff_win',
        'tabulation_logs.star.runoff_tiebreak',
    ];
    const roundLogGroups = results.roundResults.map(round => {
        const logGroups = [];
        let group = [];
        round.logs.forEach((log) => {
            if(typeof log === 'string'){
                group.push(log);
            }else{
                group.push(t(log['key'], log));
                if(topLogs.includes(log['key'])){
                    logGroups.push(group);
                    group = [];
                }
            }
        })
        return logGroups;
    })

    // disabling for now
    const showTieBreakerWarning = false; // roundLogGroups.some(r => r.some(g => g.length > 1));

    return <Widget title={t('results.star.detailed_steps_title')} wide>
        <div className='detailedSteps'>
            { showTieBreakerWarning && <Paper elevation={2} sx={{backgroundColor: 'theme.gray4', width: '90%', margin: 'auto', textAlign: 'left', padding: 3}}>
                <b>{t('results.star.tiebreaker_note_title')}</b>️
                <hr/>
                {(t('results.star.tiebreaker_note_text') as Array<string>).slice(0, ).map((s,i) => <p key={i}>{s}</p>)}
            </Paper> }
            {results.roundResults.map((round, r) => (
                <Box key={r}>
                    {rounds > 1 && <Typography variant="h4">{`Winner ${r + 1}`}</Typography>}
                    <ul style={{listStyleType: 'none'}}>
                        {roundLogGroups[r].map((group, i) => <li key={i} style={{textAlign: 'left'}}>
                            {group.length == 1 && group[0]}
                            {group.length > 1 && <details key={i}>
                                <summary>{group.at(-1)}</summary>
                                <ol>
                                    {group.slice(0, -1).map((item, j) => <li key={j}>{item}</li>)}
                                </ol>
                            </details>}
                        </li>)}
                    </ul>
                </Box>
            ))}
        </div>
    </Widget>
}

export default STARResultDetailedStepsWidget;