import { Box, Link, Paper, Typography } from '@mui/material';
import { Candidate } from '@equal-vote/star-vote-shared/domain_model/Candidate';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
interface CandidateLabelProps {
  candidate: Candidate;
  gridArea: any;
}
export default function CandidateLabel({ candidate, gridArea }: CandidateLabelProps) {
  return (
    <Box
      sx={{
        gridArea: gridArea,
        mt: '16px',
      }}>
      {candidate.photo_filename &&
        <Paper
          component="img"
          alt="Equal Vote Coalition Logo"
          src={candidate.photo_filename}
          elevation={2}
          
          sx={{
            mr: 2,
            width: '150px',
            height: '150px',
            objectFit: 'contain',
            borderRadius: '10px',
            background: 'none',
            p: 1,
          }}
        />
      }
        <Typography className="rowHeading" align='left' variant="h6" component="h6" sx={{
          wordBreak: "break-word",
          px: {
            xs: 0,
            sm: '10px',
          },
          my: 0,
          textAlign: {
            xs: 'center',
            sm: candidate.photo_filename ? 'center' : 'left',
          },
          width: '100%'
        }}>
          {candidate.candidate_url && <Link href={candidate.candidate_url} target='_blank'>{candidate.candidate_name}<OpenInNewIcon sx={{ height: 15 }} /></Link>}
          {!candidate.candidate_url && candidate.candidate_name}
        </Typography>
      </Box>
  );
}