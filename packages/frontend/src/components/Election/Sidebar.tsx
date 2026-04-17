import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Button, Divider, Grid } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Paper } from '@mui/material';
import useElection from '../ElectionContextProvider';
import useFeatureFlags from '../FeatureFlagContextProvider';
import HomeIcon from '@mui/icons-material/Home';
import BallotIcon from '@mui/icons-material/Ballot';
import PreviewIcon from '@mui/icons-material/Preview';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import SendIcon from '@mui/icons-material/Send';
import BarChartIcon from '@mui/icons-material/BarChart';
import { PrimaryButton, SecondaryButton } from '../styles';

function useAdminPages() {
    const { election } = useElection();
    const flags = useFeatureFlags();
    const id = election.election_id;
    const isDraft = election.state === 'draft';
    return [
        { label: 'Admin Home',        path: `/${id}/admin`,              icon: <HomeIcon/> },
        { label: 'Build Ballot',      path: `/${id}/admin/build_ballot`, icon: <BallotIcon/> },
        ...(flags.isSet('ELECTION_ROLES') ? [{ label: 'Edit Election Roles', path: `/${id}/admin/roles`, icon: <HomeIcon/> }] : []),
        { label: 'Manage Voters',     path: `/${id}/admin/voters`,       icon: <PeopleAltIcon/> },
        { label: 'Settings',          path: `/${id}/admin/settings`,     icon: <SettingsIcon/> },
        { label: isDraft ? 'Preview Ballot' : 'Live Ballot',   path: `/${id}`,         icon: <PreviewIcon/> },
        { label: isDraft ? 'Preview Results' : 'Live Results', path: `/${id}/results`, icon: <BarChartIcon/> },
        { label: 'Publish & Share',   path: `/${id}/admin/publish`,      icon: <SendIcon/> },
    ];
}

const ListItem = ({ text, link, icon, isActive }: { text:string, link: string, icon: any, isActive?: boolean }) => {
    return (
        <Button
            component={Link}
            to={link}
            fullWidth
            sx={{
                justifyContent: { xs: 'center', md: 'flex-start' },
                pl: {xs: 0, md: 2},
                backgroundColor: isActive ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.12)',
                },
            }}
        >
            {icon}
            {/*<Typography gutterBottom variant="h6" component="h6" sx={{ml: 1}}>*/}
            <Typography gutterBottom component="p" sx={{ml: 1}}>
                {text}
            </Typography>
        </Button>
    )
}

export function AdminPageNavigation() {
    const { voterAuth } = useElection();
    const pages = useAdminPages();
    const location = useLocation();
    const navigate = useNavigate();

    if (!voterAuth?.roles?.length) return null;

    const normalizedCurrent = location.pathname.replace(/\/$/, '') || '/';
    const currentIndex = pages.findIndex(p => p.path.replace(/\/$/, '') === normalizedCurrent);

    if (currentIndex === -1) return null;

    const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
    const nextPage = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

    return (
        <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', flexShrink: 0 }}>
            <Divider sx={{ mt: 4, mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SecondaryButton
                    onClick={() => navigate(prevPage!.path)}
                    sx={{ visibility: prevPage ? 'visible' : 'hidden' }}
                >
                    Back
                </SecondaryButton>
                {nextPage && (
                    <PrimaryButton onClick={() => navigate(nextPage.path)}>
                        {`Proceed to ${nextPage.label}`}
                    </PrimaryButton>
                )}
            </Box>
        </Box>
    );
}

export default function Sidebar() {
    const { voterAuth } = useElection();
    const pages = useAdminPages();
    const location = useLocation();
    const normalizedCurrent = location.pathname.replace(/\/$/, '') || '/';
    return (
        <>
            {voterAuth?.roles?.length > 0 &&
                <Box
                    display='flex'
                    flexDirection='column'
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                        position: 'sticky',
                        top: 16,
                        alignSelf: 'flex-start',
                        "@media print": {
                            display: 'none',
                        }
                    }}>
                    <Paper elevation={3}>
                        {pages.map(p => (
                            <ListItem
                                key={p.path}
                                text={p.label}
                                link={p.path}
                                icon={p.icon}
                                isActive={p.path.replace(/\/$/, '') === normalizedCurrent}
                            />
                        ))}
                    </Paper>
                </Box>
            }
        </>
    );
}
