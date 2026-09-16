import { Box, Typography } from '@mui/material';
import { useThemeSelector } from '../../theme';

export default function LandingPageOpenSource() {
    const themeSelector = useThemeSelector()

    return (
        <Box sx={{
            background: themeSelector.mode === 'darkMode' ? 'brand.gray5' : 'brand.gray1',
            clip: 'unset',
            width: '100%',
            p: { xs: 2},
            mb: '2rem', // matching the gap from the root flex box
        }}>
            <Box sx={{
                maxWidth: '700px',
                width: '100%',
                margin: 'auto',
            }}>
                <Typography variant='h4' sx={{ textAlign: 'center' }}>Open Source</Typography>
                <Typography sx={{textAlign: 'center' }}>
                    This project is shared <a href="https://github.com/Equal-Vote/bettervoting">open source</a> under a AGPL-3.0 license.<br/>Run your elections via BetterVoting or self host on your own server.
                </Typography>
            </Box>
        </Box>
    )
}