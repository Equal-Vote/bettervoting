import ButtonBase from '@mui/material/ButtonBase';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import { openFeedback, useSubstitutedTranslation } from './util';

// Floating feedback launcher, pinned bottom-right. Replaces the Freshworks
// widget's launcher button, reproduced from the live widget so the swap to
// Fider is invisible to users.
//
// Measurements come from the rendered launcher and the widget's own bundle:
//   border-radius  30px 8px 30px 30px   (asymmetric -- square-ish top right)
//   padding        8px
//   box-shadow     0 2px 8px rgba(0,0,0,0.2)
//   font-size      0.875rem, weight 600
//   icon           16x16, white, left of the label
//   offsets        30px from right and bottom  (widget config 63000001746)
//
// The background is --brand-pop (#86C66A). That was never the widget's
// configured button_color (#006063) -- an onload hack in index.html
// reassigned it on every page load. Now it's simply declared.
//
// Hidden below 900px and when printing, matching the #launcher-frame rules
// that governed the old button.
const FeedbackButton = () => {
    const { t } = useSubstitutedTranslation();

    return (
        <ButtonBase
            onClick={openFeedback}
            sx={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                zIndex: (theme) => theme.zIndex.speedDial,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: '30px 8px 30px 30px',
                backgroundColor: 'var(--brand-pop)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                lineHeight: 1.4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                '&:hover': { backgroundColor: 'var(--brand-pop)', filter: 'brightness(0.94)' },
                '@media (max-width: 900px)': { display: 'none' },
                '@media print': { display: 'none' },
            }}
        >
            <HelpOutlineIcon sx={{ width: 16, height: 16, fill: '#ffffff' }} />
            {t('nav.feedback')}
        </ButtonBase>
    );
};

export default FeedbackButton;
