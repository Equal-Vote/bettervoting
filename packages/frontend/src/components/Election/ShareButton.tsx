import ListItem from "@mui/material/ListItem"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Fade from "@mui/material/Fade"
import Paper from "@mui/material/Paper"
import FacebookIcon from "@mui/icons-material/Facebook"
import { X } from "@mui/icons-material";
import RedditIcon from "@mui/icons-material/Reddit"
import LinkIcon from "@mui/icons-material/Link"
import { Menu } from "@mui/material";
import { SecondaryButton } from "../styles";
import useSnackbar from "../SnackbarContext";
import { useSubstitutedTranslation } from "../util";
import { useState } from "react"
import useElection from '../ElectionContextProvider';

import IosShareIcon from '@mui/icons-material/IosShare';

export default function ShareButton({ url }: { url: string }) {
    const { setSnack } = useSnackbar()
    const [anchorElNav, setAnchorElNav] = useState(null)

    const { election } = useElection();

    const {t} = useSubstitutedTranslation();

    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    const handleShare = e => {
        e.preventDefault()

        const ahref = url
        const encodedAhref = encodeURIComponent(ahref)
        let link

        const pageTitle = election?.title || "";
        const votingMethods = Array.from(new Set((election?.races || []).map(r => r.voting_method)));
        let votingDesc = "";
        const termType = election?.settings?.term_type === 'poll' ? 'poll' : 'election';
        if (votingMethods.length === 1) {
            votingDesc = ` [with the ${votingMethods[0]} voting system]`;
        } else if (votingMethods.length === 2) {
            votingDesc = ` [including 2 different voting systems: ${votingMethods.join(" and ")}]`;
        } else if (votingMethods.length > 2) {
            votingDesc = ` [including ${votingMethods.length} different voting systems: ${votingMethods.join(", ")}]`;
        }
        const shareTitle = encodeURIComponent(`Vote in a new BetterVoting ${termType}: "${pageTitle}"${votingDesc}`);

        switch (e.currentTarget.id) {
            case "facebook":
                // Facebook automatically shows the page prettily, so URL is fine
                // Passing "quote" param to prefill text is weirdly spotty anyway
                link = `https://www.facebook.com/sharer/sharer.php?u=${encodedAhref}`;
                open(link);
                break;

            case "X":
                // Reddit uses the "url" and "title" params to prefill submission
                link = `https://x.com/intent/tweet?url=${encodedAhref}&text=${shareTitle}`;
                open(link);
                break;

            case "reddit":
                // Reddit uses the "url" and "title" params to prefill submission
                link = `https://new.reddit.com/submit?url=${encodedAhref}&title=${shareTitle}`;
                open(link)
                break

            case "copy":
                navigator.clipboard.writeText(ahref)
                setSnack({
                    message: t('share.link_copied'),
                    severity: 'success',
                    open: true,
                    autoHideDuration: 6000,
                })
                break

            default:
                break
        }
    }

    const open = socialLink => {
        window.open(socialLink, "_blank")
    }

    return (
        <>
            <SecondaryButton
                fullWidth
                onClick={handleOpenNavMenu}>
                {t('share.button')}
                <IosShareIcon sx={{pl: 1}} />
            </SecondaryButton>
            <Fade timeout={350}>
                <Paper >
                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorElNav}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        open={Boolean(anchorElNav)}
                        onClose={handleCloseNavMenu}>
                        <ListItem
                            button
                            id="facebook"
                            onClick={handleShare}
                        >
                            <ListItemIcon>
                                <FacebookIcon />
                            </ListItemIcon>
                            <ListItemText primary={t('share.facebook')}/>
                        </ListItem>
                        <ListItem
                            button
                            id="X"
                            onClick={handleShare}
                        >
                            <ListItemIcon>
                                <X />
                            </ListItemIcon>
                            <ListItemText primary={t('share.X')}/>
                        </ListItem>
                        <ListItem
                            button
                            id="reddit"
                            onClick={handleShare}
                        >
                            <ListItemIcon>
                                <RedditIcon />
                            </ListItemIcon>
                            <ListItemText primary={t('share.reddit')}/>
                        </ListItem>
                        <ListItem
                            button
                            id="copy"
                            onClick={handleShare}
                        >
                            <ListItemIcon>
                                <LinkIcon />
                            </ListItemIcon>
                            <ListItemText primary={t('share.copy_link')}/>
                        </ListItem>
                    </Menu>
                </Paper>
            </Fade>
        </>

    )
}