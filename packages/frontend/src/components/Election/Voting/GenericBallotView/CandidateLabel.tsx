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
      {candidate.photo_filename && <Box sx={{mr: 2}}>
        {/*<Box
          sx={{
            width: '150px',
            height: '150px',
            borderRadius: '10px',
            backgroundImage: `url(${candidate.photo_filename})`,
            position: 'absolute',
        }}
        />*/}
        <Box
          component="img"
          alt="Equal Vote Coalition Logo"
          src={candidate.photo_filename}
          
          sx={{
            width: '150px',
            height: '150px',
            objectFit: 'contain',
            borderRadius: '10px',
            // copied from paper elevation=1
            //boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
            //boxShadow: '0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12)',
            //p: 1,
            //backdropFilter: 'brightness(150%) grayscale(20%) blur(40px)'
          }}
        />
      </Box>
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