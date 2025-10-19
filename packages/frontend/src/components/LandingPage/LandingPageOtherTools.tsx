import { Box, Card, CardActionArea, CardContent, Paper, Typography } from '@mui/material'
import { useSubstitutedTranslation } from '../util'
import { useNavigate } from 'react-router';

export default function(){
    const { t } = useSubstitutedTranslation();
    const items = t('landing_page.other_tools.items')

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
                <Typography variant='h4' color={'darkShade.contrastText'} sx={{ textAlign: 'center' }}>{t('landing_page.other_tools.title')}</Typography>
            </Box>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: '2rem',
                p: { xs: 4 },
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
                {items.map((item, i) =>
                    <Card className='otherTool' onClick={() => window.location.href = item.url} elevation={8} sx={{
                        width: '100%',
                        maxWidth: '20rem',
                        display: 'flex',
                        flexDirection: 'column',
                        flexShrink: '0',
                    }}>
                        <CardActionArea sx={{p: { xs: 2, md: 2 }, backgroundColor: 'lightShade.main'}}>
                            <CardContent>
                                <Box display='flex' flexDirection='row' gap={1} sx={{pb: 1}}>
                                    <Box
                                        component="img"
                                        sx={{height: '50px',}}
                                        src={item.icon_url}
                                    />
                                    <Typography component='p' color={'lightAccent.contrastText'}><b>{item.name}</b></Typography>
                                </Box>
                                <Typography sx={{textAlign: 'left', color: 'lightAccent.contrastText'}}>{item.description}</Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                )}
            </Box>
        </Box>
    )
}