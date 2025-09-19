import { useContext } from 'react'
import Grid from "@mui/material/Grid";
import Typography from '@mui/material/Typography';
import { Alert, Checkbox, FormControlLabel, FormGroup, Link } from "@mui/material";
import Box from '@mui/material/Box';
import { BallotContext } from "../VotePage";
import useElection from "../../../ElectionContextProvider";
import useFeatureFlags from "../../../FeatureFlagContextProvider";
import { useSubstitutedTranslation } from "~/components/util";
import GenericBallotGrid from "./GenericBallotGrid";

interface GenericBallotViewProps {
  onClick: (candidateIndex: number, columnValue: number) => void;
  columns: string[];
  methodKey: string;
  columnValues?: number[];
  starHeadings?: boolean;
  onlyGrid?: boolean;
}

export default function GenericBallotView({
  onClick,
  columns,
  methodKey,
  columnValues=null,
  starHeadings=false,
  onlyGrid=false,
}: GenericBallotViewProps) {
  if(columnValues == null){
    columnValues = columns.map(Number);
  }
  
  const flags = useFeatureFlags();
  const { election } = useElection();

  const ballotContext = useContext(BallotContext);

  const {t} = useSubstitutedTranslation(election?.settings.term_type ?? 'election');

  const methodName = t(`methods.${methodKey}.full_name`);

  const leftKey = `ballot.methods.${methodKey}.left_title`;
  const leftTitle = t(leftKey);
  const rightTitle = t(`ballot.methods.${methodKey}.right_title`);


  const learnLinkKey = `methods.${methodKey}.learn_link`
  const learnLink = (t(learnLinkKey) == learnLinkKey)? '' : t(learnLinkKey);
  const numWinners = ballotContext.race.num_winners;
  const spelledNumWinners = numWinners < 11 ? t(`spelled_numbers.${numWinners}`) : numWinners;

  if(onlyGrid)
    return <Box border={2} sx={{ mt: 0, ml: 0, mr: 0, width: '100%' }} className="ballot">
      <GenericBallotGrid
        ballotContext={ballotContext}
        starHeadings={starHeadings}
        columns={columns}
        leftTitle={leftTitle}
        rightTitle={rightTitle}
        onClick={onClick}
        columnValues={columnValues}
      />
    </Box>

  return (
      <Box border={2} sx={{ mt: 0, ml: 0, mr: 0, width: '100%' }} className="ballot">
        <Grid container alignItems="center" justifyContent="center" direction="column">

          <Grid item sx={{ p: 3 }}>
            <Typography align='center' variant="h5" component="h4" fontWeight={'bold'}>
              {ballotContext.race.title}
            </Typography>
          </Grid>
          {ballotContext.race.description && 
            <Grid item sx={{ pb: 5, px: 3 }}>
            <Typography align='center' component="p" style={{whiteSpace: 'pre-line'}}>
              {ballotContext.race.description}
            </Typography>
          </Grid>}

          <Grid item xs={8} sx={{ pb:1, px:4 }} className="instructions">
            <Typography align='left' sx={{ typography: { sm: 'body1', xs: 'body2' } }}>
              {election.settings.draggable_ballot && ballotContext.race.voting_method === 'IRV'
                ? t('ballot.this_election_uses_draggable', {voting_method: methodName, count: ballotContext.race.num_winners, spelled_count: spelledNumWinners})
                : t('ballot.this_election_uses', {voting_method: methodName, count: ballotContext.race.num_winners, spelled_count: spelledNumWinners})
              }
            </Typography>

            {t(`ballot.methods.${methodKey}.instruction_bullets`).map((bullet, bulletIndex) => 
              <Typography key={bulletIndex} align='left' sx={{ typography: { sm: 'body1', xs: 'body2' } }} component="li">
                {bullet}
              </Typography>
            )}
            { !flags.isSet('FORCE_DISABLE_INSTRUCTION_CONFIRMATION') && election.settings.require_instruction_confirmation &&
            <FormGroup>
              <FormControlLabel
                sx={{pb:5, pl:4, pt: 1}}
                control={
                  <Checkbox
                    disabled={ballotContext.instructionsRead}
                    checked={ballotContext.instructionsRead}
                    onChange={() => ballotContext.setInstructionsRead()}
                  />
                }
                label={t('ballot.instructions_checkbox')}
              />
            </FormGroup>
            }
          </Grid>

          <GenericBallotGrid
            ballotContext={ballotContext}
            starHeadings={starHeadings}
            columns={columns}
            leftTitle={leftTitle}
            rightTitle={rightTitle}
            onClick={onClick}
            columnValues={columnValues}
          />

          <Grid item xs={10} sx={{ p:5, px:4 }} className="footer">
            <Typography align='left' sx={{ typography: { sm: 'body1', xs: 'body2' } }}>
              {t(`ballot.methods.${methodKey}.footer_${ballotContext.race.num_winners == 1 ? 'single_winner' : 'multi_winner'}`,
                {n: ballotContext.race.num_winners})
              }
            </Typography>
            <br/>
            {learnLink != '' &&
            <Typography align='left' sx={{ typography: { sm: 'body1', xs: 'body2' } }}>
              <Link href={learnLink} target='_blank'>{t('ballot.learn_more', {voting_method: methodName})}</Link>
            </Typography>
            }
          </Grid>

          { ballotContext.warnings && ballotContext.warnings.map(({message, severity}, warningIndex) => 
            <Alert 
              key={warningIndex}
              severity={severity}
          sx={{
              marginLeft:'10%', 
              marginRight:'10%', 
              marginBottom:'.4cm', 
              padding: '.2cm',
              }}>
              {/* <Typography>⚠️</Typography> */}
              <Typography style={{paddingLeft:'30px'}}>{message}</Typography>
            </Alert>
          )}
        </Grid>
      </Box>
  );
}
