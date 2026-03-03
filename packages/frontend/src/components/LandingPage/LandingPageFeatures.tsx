import { Box, Typography } from '@mui/material'
import { useSubstitutedTranslation } from '../util';


interface FeaturePanel{
    title: string;
    text: string;
}

const LandingPageFeatures = () => {
    const {t} = useSubstitutedTranslation('election');

    const panels = t('landing_page.features.items') as FeaturePanel[];

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'darkShade.main',
            clip: 'unset',
            width: '100%',
            p: { xs: 2},
        }}>
            <Box sx={{
                width: '100%',
                maxWidth: '1300px',
                margin: 'auto',
                p: { xs: 2, md: 4 },
            }}>
                <Typography variant='h4' sx={{textAlign: 'center', color: 'darkShade.contrastText'}}>{t('landing_page.features.title')}</Typography>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    paddingTop: '2rem',
                    gap: '2rem',
                }}>
                    {panels.map((panel, i) => <Box key={i} sx={{width: '380px'}}>
                        <Typography variant='h4' sx={{color: 'darkShade.contrastText'}}>{panel.title}</Typography>
                        <Typography component='p' sx={{color: 'darkShade.contrastText'}}>{panel.text}</Typography>
                    </Box>)}
                </Box>
            </Box>
        </Box>
    )
}
export default LandingPageFeatures