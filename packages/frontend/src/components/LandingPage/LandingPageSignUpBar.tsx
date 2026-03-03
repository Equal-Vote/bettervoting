import { Box, Typography } from '@mui/material';
import { PrimaryButton } from '../styles';
import useAuthSession from '../AuthSessionContextProvider';
import { useThemeSelector } from '../../theme';
import { useSubstitutedTranslation } from '../util';

const LandingPageSignUpBar = () => {
    const authSession = useAuthSession()
    const themeSelector = useThemeSelector()
    const {t} = useSubstitutedTranslation();

    return (
        <Box sx={{
            background: themeSelector.mode === 'darkMode' ? 'brand.gray5' : 'brand.gray1',
            clip: 'unset',
            width: '100%',
            p: { xs: 2},
        }}>
            <Box sx={{
                width: '100%',
                maxWidth: '650px',
                margin: 'auto',
                display: 'flex',
                flexDirection: {xs: 'column', md: 'row'},
                alignContent: 'center',
                justifyContent: 'space-between',
            }}>
                <Typography variant='h6' sx={{textAlign: {xs: 'center', md: 'left'}}}>{t('landing_page.sign_up.text')}</Typography>
                {/*I just copied styled button but removed the full width*/ }
                <PrimaryButton
                    onClick={() => authSession.openLogin()}
                >
                    {t('landing_page.sign_up.button')}
                </PrimaryButton>
            </Box>
        </Box>
    )
}

export default LandingPageSignUpBar