import { Box, Paper, Typography } from '@mui/material'
import { useSubstitutedTranslation } from '../util'

const LandingPagePricing = () => {

    const { t } = useSubstitutedTranslation();
    const options = t('landing_page.pricing.items')

    return (
        <Box sx={{
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
                <Typography variant='h4' color={'darkShade.contrastText'} sx={{ textAlign: 'center' }}>{t('landing_page.pricing.title')}</Typography>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: '5rem',
                p: { xs: 4 },
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
                {options.map((option, i) =>
                    <Paper key={i} className='pricingOption' elevation={8} sx={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        flexShrink: '0',
                        p: { xs: 2, md: 2 },
                        maxWidth: '25rem',
                    }}>
                        <Typography variant='h5'>{option.title}</Typography>
                        <Typography variant='h6'><b>{option.price}</b></Typography>
                        <Typography variant='h6'>{option.description}</Typography>
                    </Paper>
                )}
            </Box>
        </Box>
    )
}
export default LandingPagePricing