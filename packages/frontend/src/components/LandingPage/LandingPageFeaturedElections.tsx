import { Box, Typography } from '@mui/material'
import FeaturedElection from './FeaturedElection'
import { useSubstitutedTranslation } from '../util'

const LandingPageFeaturedElections = ({ electionIds }: { electionIds: string[] }) => {
    const { t } = useSubstitutedTranslation();
    return <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'darkShade.main',
        clip: 'unset',
        width: '100%',
        p: { xs: 2 },
    }}>
        <Box sx={{
            width: '100%',
            maxWidth: '1300px',
            margin: 'auto',
        }}>
            <Typography variant='h4' color={'darkShade.contrastText'} sx={{ textAlign: 'center' }}>{t('landing_page.featured_elections.title')}</Typography>
        </Box>

        <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: '2rem',
            p: { xs: 4 },
            justifyContent: 'center',
            flexWrap: 'wrap',
        }}>
            {electionIds.map((electionId, i) => <Box key={i}><FeaturedElection key={i} electionId={electionId} /></Box>)}
        </Box>
    </Box>
}
export default LandingPageFeaturedElections
