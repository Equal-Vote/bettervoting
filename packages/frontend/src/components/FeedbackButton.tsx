import Fab from '@mui/material/Fab';
import { openFeedback, useSubstitutedTranslation } from './util';

// Floating feedback launcher, pinned bottom-right. Replaces the Freshworks
// widget's own launcher button, which used to sit here.
//
// Geometry and colours are taken from the live Freshworks widget config
// (widget id 63000001746) so this lands in the same place and reads the same:
//   button_text        "Feedback?"   -> nav.feedback
//   offset_from_right  30
//   offset_from_bottom 30
//   button_text_color  #ffffff
// The config's own button_color (#006063) was never what shipped -- an onload
// hack in index.html reassigned it to #86C66A on every page load, which is
// --brand-pop. That override is now just the declared colour.
//
// Hidden below 900px and when printing, matching the #launcher-frame rules that
// previously governed the Freshworks button.
const FeedbackButton = () => {
    const { t } = useSubstitutedTranslation();

    return (
        <Fab
            variant='extended'
            onClick={openFeedback}
            sx={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                zIndex: (theme) => theme.zIndex.speedDial,
                textTransform: 'none',
                backgroundColor: 'var(--brand-pop)',
                color: '#ffffff',
                '&:hover': { backgroundColor: 'var(--brand-pop)', filter: 'brightness(0.94)' },
                '@media (max-width: 900px)': { display: 'none' },
                '@media print': { display: 'none' },
            }}
        >
            {t('nav.feedback')}
        </Fab>
    );
};

export default FeedbackButton;
