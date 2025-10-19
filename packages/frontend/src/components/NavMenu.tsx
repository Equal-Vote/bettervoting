import { Button, IconButton, Menu, Typography } from "@mui/material";
import { popoverClasses } from "@mui/material/Popover";
import { useState } from "react";
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';

const navTextSx = {fontWeight: 'bold', fontSize: '1.2rem'};

const headerTextColor = 'primary.contrastText'


// https://stackoverflow.com/questions/55318477/how-to-make-material-ui-menu-based-on-hover-not-click
export default function({name, onClick=undefined, desktopText=undefined, mobileIcon=undefined, href=undefined, target=undefined, children}){
    const [anchorEl, setAnchorEl] = useState(null)

    let currentlyHovering = false;

    const tryDropdown = (ev) => {
        if(onClick) return;
        if(href) return;
        if(anchorEl == ev.currentTarget) return;
        handleHover();
        setAnchorEl(ev.currentTarget);
    }

    const handleClose = () => {
        currentlyHovering = false;
        setAnchorEl(null);
    }

    const handleHover = () => currentlyHovering = true;

    const handleCloseHover = () => {
        currentlyHovering = false;
        setTimeout(() => {
            if (!currentlyHovering) {
                handleClose();
            }
        }, 50);
    }

    return <>
        {mobileIcon && <IconButton
            size="large"
            aria-controls={`menu-${name}`}
            aria-haspopup="true"
            onClick={onClick? onClick : tryDropdown}
            color="inherit"
            sx={{display: { xs: 'flex', md: 'none' }}}
        >
            {mobileIcon}
        </IconButton>}
        {desktopText && <Button
            color='inherit'
            onClick={onClick? onClick : tryDropdown}
            onMouseOver={onClick? () => {} : tryDropdown}
            onMouseLeave={handleCloseHover}
            href={href}
            target={target}
            sx={{
                display: { xs: 'none', md: 'flex' },
                textDecoration: 'none',
                '&:hover': {textDecoration: 'underline'}
            }} 
        >
            <Typography component="p" sx={navTextSx} color={headerTextColor} textTransform='none'>
                {desktopText} 
            </Typography>
        </Button>}
        <Menu
            id={`menu-${name}`}
            anchorEl={anchorEl}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            keepMounted
            MenuListProps={{
                onMouseEnter: handleHover,
                onMouseLeave: handleCloseHover,
                style: { pointerEvents: "auto" }
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{ [`&.${popoverClasses.root}`]: {xs: {}, md: { pointerEvents: "none" }}, }}
            disableScrollLock
            // https://github.com/mui/material-ui/issues/10072
            disableRestoreFocus
        >
            {children}
        </Menu>
    </>
}