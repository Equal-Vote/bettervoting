import { ElectionState } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Chip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useSubstitutedTranslation } from '~/components/util';

const getStateColor = (state: string) => {
  switch (state) {
    // Election State
    case 'draft':
      return 'purple';
    case 'finalized':
      return 'green';
    case 'open':
      return 'blue';
    case 'closed':
      // changed from red, since being closed isn't a bad thing. It just means the voting period is finished
      return 'orange'; 
    case 'archived':
      return 'gray4';
    // Voted
    case 'Voted':
      return 'green';
    case 'Not Voted':
      return 'orange';
    // Sent
    case 'Sent':
      return 'blue';
    case 'Not Sent':
      return 'purple';
    case 'Failed':
      return 'red';
    // Upload Status
    case 'Pending':
      return 'blue';
    case 'In Progress':
      return 'purple';
    case 'Done':
      return 'green';
    case 'Error':
      return 'red';
    default:
      return 'gray4';
  }
}

export const makeChipStyle = (state: string) => {
  const chipColor = getStateColor(state);
  return {
    backgroundColor: `brand.${chipColor}Transparent20`,
    color: `brand.${chipColor}`,
    border: "solid 1px",
    borderColor: `brand.${chipColor}`,
    // marginX: 2,
  }
}

export default function ElectionStateChip({ state }: { state: ElectionState }) {
  const {t} = useSubstitutedTranslation();

  const chipStyle = useMemo(() => makeChipStyle(state), [state]);

  return (
    <Chip
      label={
        <Typography variant="h5" component="span">
          {t(`election_state.${state}`)}
        </Typography>
      }
      sx={{...chipStyle, marginX: 2}}
      variant="outlined"
    />
  );
}
