import { useContext, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Accordion, AccordionDetails, AccordionSummary, Box, IconButton, Link, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import useAuthSession from './AuthSessionContextProvider';
import { useThemeSelector } from '../theme';
import useFeatureFlags from './FeatureFlagContextProvider';
import { CreateElectionContext } from './ElectionForm/CreateElectionDialog';
import { openFeedback, useSubstitutedTranslation } from './util';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { makeID, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

import { ReturnToClassicContext } from './ReturnToClassicDialog';
import { useCookie } from '~/hooks/useCookie';
import NavMenu from './NavMenu';
import { PrimaryButton } from './styles';

const headerTextColor = 'primary.contrastText'
const Header = () => {
    const flags = useFeatureFlags();
    const themeSelector = useThemeSelector()
    const authSession = useAuthSession()
    // this is important for setting the default value
    useCookie('temp_id', makeID(ID_PREFIXES.VOTER, ID_LENGTHS.VOTER))
    const [openedMenu, setOpenedMenu] = useState(null);
    const {t} = useSubstitutedTranslation();

    const createElectionContext = useContext(CreateElectionContext);

    const navTextSx = {fontWeight: 'bold', fontSize: '1rem'};

    const navItems = [
        {
            text: t('nav.about'),
            href: '/about',
            target: '_self',
        },
        {
            text: 'Voting Methods',
            items: [
                {
                    text: 'STAR Voting',
                    href: 'https://www.equal.vote/star',
                    target: '_self',
                },
                {
                    text: 'Ranked Robin',
                    href: 'https://www.equal.vote/ranked_robin',
                    target: '_self',
                },
                {
                    text: 'Approval',
                    href: 'https://www.equal.vote/approval',
                    target: '_self',
                },
                {
                    text: 'STAR PR',
                    href: 'https://www.equal.vote/pr',
                    target: '_self',
                },
                {
                    text: 'Ranked Choice Voting',
                    href: 'https://www.equal.vote/beyond_rcv',
                    target: '_self',
                },
            ]
        },
        {
            text: t('nav.public_elections'),
            href: '/browse',
            target: '_self',
        },
        {
            text: 'Paper Ballots',
            items: [
                {
                    text: 'E-Voting w/ Paper Receipts',
                    href: '/new_election',
                    target: '_self',
                },
                {
                    text: 'Print Ballots',
                    href: 'https://docs.google.com/presentation/d/1va-XEsUy0VI0jCTAHrQ_f9HNKex3VK9cm7WfF6jhUYM/edit',
                    target: '_self',
                },
                {
                    text: 'Paper Ballots',
                    href: 'https://docs.bettervoting.com/help/paper_ballots.html',
                    target: '_self',
                },
                {
                    text: 'Hand Counting',
                    href: '/hand_count',
                    target: '_self',
                },
            ]
        },
        {
            text: 'Stories' ,
            href: 'https://starvoting.org/case_studies',
            target: '_self',
        },
        {
            text: 'Create Election' ,
            href: '/new_election',
            target: '_self',
        },
    ];

    const returnToClassicContext = useContext(ReturnToClassicContext);

    return (
        <AppBar className="navbar" position="sticky" sx={{ backgroundColor: /*"darkShade.main"*/"black", '@media print': {display: 'none', boxShadow: 'none'}}}>
            <Toolbar>
                {/**** MOBILE HAMBURGER MENU ****/}
                <Box sx={{ flexGrow: 0, display: { xs: 'flex', md: 'none' } }}>
                    <NavMenu name='mobile-hamburger' mobileIcon={<MenuIcon/>}>
                        {navItems.map((item, i) => 
                            <MenuItem
                                key={`mobile-nav-${i}`}
                                component={Link}
                                href={item.href}
                                target={item.target}
                            >
                                {!item.items && item.text }
                                {item.items && <Accordion
                                        elevation={0}
                                        disableGutters
                                        sx={{
                                            backgroundColor: "transparent",
                                            width: '100%'
                                        }}
                                    >
                                        <AccordionSummary sx={{p: 0, m: 0, minHeight: 0}}>
                                            <span>{item.text}</span>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{p: 0, m: 0, mt: '.5rem', background: '#eeeeee', width: '100%' }}>
                                            {item.items.map((subitem, i) => 
                                                <MenuItem key={i} component={Link} href={subitem.href} target={subitem.target}>{subitem.text}</MenuItem>
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                }
                            </MenuItem>
                        )}
                        <MenuItem onClick={openFeedback}>
                            {t('nav.feedback')}
                        </MenuItem>
                        <MenuItem onClick={returnToClassicContext.openDialog}>
                            {t('return_to_classic.button')}
                        </MenuItem>
                    </NavMenu>
                </Box>

                {/**** BetterVoting Logo ****/}
                <IconButton
                    size="large"
                    href="/"
                    sx={{display: 'flex', gap: 1, flexGrow: {xs: '1', md: '0'}, mr: {xs: 0, md: 5}, py: '12px', px: '8px'}}>
                        {/* I don't remember what the margin right 5 was for, but I added xs since it was breaking mobile*/}
                        {
                            /* I thought the favicon looked a bit too busy */
                            /*<Avatar src='/favicon-local.png'/>*/
                        }
                        {/* top should be 18.8% of the height*/}
                        <Box component="img" sx={{position: 'relative', height: '50px', top: '7px'}} src='/logo.png' alt='BetterVoting Beta Logo'/>
                </IconButton>

                {/**** DESKTOP OPTIONS ****/}
                <Box
                    sx={{ flexGrow: 100, flexWrap: 'wrap', display: { xs: 'none', md: 'flex' }, gap: 4, rowGap: 0, position: 'relative', justifyContent: 'center' }}>
                    {navItems.map((item, i) => 
                        <NavMenu name={`desktop-nav-${i}`} desktopText={item.text} href={item.href} target={item.target}>
                            {!item.items && <></>}
                            {item.items && item.items.map((subitem, j) => 
                                <MenuItem
                                    key={`desktop-subnav-${i}-${j}`}
                                    component={Link}
                                    href={subitem.href}
                                    target={subitem.target}
                                >
                                    {subitem.text}
                                </MenuItem>
                            )}
                            {/* Saving this for when we have a search bar
                            <Paper sx={{display: 'flex', alignItems: 'center', background: 'white', align: 'center', marginTop: 'auto', marginBottom: 'auto', padding: 1}}>
                                <Search />
                                <InputBase placeholder="Search Public Elections"/>
                            </Paper>
                            */}
                        </NavMenu>
                    )}
                </Box>

                {/**** ACCOUNT OPTIONS ****/}
                <Box sx={{ flexGrow: 0, ml: 5}}>
                    {authSession.isLoggedIn() && <>
                        {/*<NavMenu name='new_election' desktopText={t('nav.new_election')} onClick={() => createElectionContext.openDialog()}>
                            <></>
                        </NavMenu>*/}
                        <NavMenu name='user' mobileIcon={<AccountCircleIcon/>} desktopText={t('nav.greeting', {name: authSession.getIdField('given_name')})}>
                            <MenuItem component={Link} href={authSession.accountUrl} target='_blank'>
                                {t('nav.your_account')}
                            </MenuItem>
                            <MenuItem component={Link} onClick={() => createElectionContext.openDialog()}>
                                {t('nav.new_election')}
                            </MenuItem>
                            {/*<MenuItem component={Link} href='/ElectionInvitations'>
                                Election Invitations
                            </MenuItem>*/}
                            <MenuItem component={Link} href='/manage'>
                                {t('nav.my_elections')}
                            </MenuItem>
                            <MenuItem component={Link} href='/vote_history'>
                                {t('nav.past_elections')}
                            </MenuItem>
                            <MenuItem
                                component={Link} 
                                href='docs.bettervoting.com'
                                target='_blank'
                            >
                                {t('nav.help')}
                            </MenuItem>
                            <MenuItem
                                color='inherit'
                                onClick={() => authSession.openLogout()}
                            >
                                {t('nav.logout')}
                            </MenuItem>
                            {flags.isSet('THEMES') && <>
                                <br/>
                                <br/>
                                <br/>
                                <MenuItem
                                    color='inherit'
                                    onClick={() => themeSelector.selectColorMode('browserDefault')}
                                >
                                    browser default
                                </MenuItem>
                                {themeSelector.modes.map((mode, i) => (
                                    <MenuItem
                                        color='inherit'
                                        onClick={() => themeSelector.selectColorMode(mode)}
                                        key={`color-${i}`}
                                    >
                                        {mode}
                                    </MenuItem>
                                ))}
                            </>}
                        </NavMenu></>
                    }
                    {!authSession.isLoggedIn() &&
                        <PrimaryButton onClick={() => authSession.openLogin()} >
                            {t('nav.sign_in')}
                        </PrimaryButton>
                    }
                </Box>
            </Toolbar>
        </AppBar >
    )
}

export default Header
