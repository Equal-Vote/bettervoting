import { Box, Typography } from '@mui/material'
import { useSubstitutedTranslation } from '../util'

const LandingPageTestimonials = () => {
    const {t} = useSubstitutedTranslation();
    const testimonials = t('landing_page.testimonials.items')
    return <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        clip: 'unset',
        width: '100%',
        p: { xs: 2},
        backgroundColor: 'darkShade.main',
    }}>
        <Box sx={{
            width: '100%',
            maxWidth: '1300px',
            margin: 'auto',
        }}>
            <Typography variant='h4' color={'darkShade.contrastText'} sx={{textAlign: 'left'}}>{t('landing_page.testimonials.title')}</Typography>
        </Box>
        <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: '2rem',
            p: { xs: 4},
            justifyContent: 'center',
            flexWrap: 'wrap',
        }}>
            {testimonials.map(testimonial => <Box key={testimonial.image_url} sx={{
                display: 'flex',
                flexDirection: 'column',
            }}>
                <Box sx={{
                    backgroundImage: `url(${testimonial.image_url})`,
                    backgroundSize: 'cover',
                    borderRadius: '100%',
                    width: '2rem',
                    height: '2rem',
                    margin: 'auto',
                }}/>
                <Typography variant='h5' color={'darkShade.contrastText'} sx={{textAlign: 'center'}}>
                    <i>&quot;{testimonial.quote}&quot;<br/>-{testimonial.name}</i>
                </Typography>
            </Box>
            )}
        </Box>
    </Box>
}
export default LandingPageTestimonials