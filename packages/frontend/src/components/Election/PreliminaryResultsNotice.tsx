import { Link, Typography } from "@mui/material";
import ElectionStateWarning from "./ElectionStateWarning";
import useElection from "../ElectionContextProvider";

// docs/help/preliminary_results.md, as published by the docs site.
const ARTICLE_URL = 'https://docs.bettervoting.com/help/preliminary_results.html';

// Shared by this notice and the line in the submit-confirm dialog, so the two
// cannot drift apart — a voter who is shown one has to be shown the other.
//
// public_results does two jobs. While voting is open it means "live tally
// visible", which is what the notice is about. Once the election closes it means
// "final results published", which carries none of the same inference risk — so
// neither surface can follow the flag alone.
export function useShowsLiveTally() {
    const { election } = useElection();
    return election.settings.public_results === true
        && (election.state === 'open' || election.state === 'draft');
}

export default function PreliminaryResultsNotice() {
    const { t, election } = useElection();
    const showsLiveTally = useShowsLiveTally();

    if (!showsLiveTally) return <></>;

    // Read voter_access directly rather than going through
    // getVoterAuthenticationMode(), which throws on a non-canonical settings
    // shape — that would take the whole ballot down with it.
    const isClosedList = election.settings.voter_access === 'closed';

    return <ElectionStateWarning
        title='preliminary_results_notice.title'
        description='preliminary_results_notice.description'
    >
        {isClosedList &&
            <Typography component='p' sx={{ mt: 1 }}>
                {t('preliminary_results_notice.closed_list')}
            </Typography>
        }
        <Typography component='p' sx={{ mt: 1 }}>
            {/* Explicit target, rather than a markdown link inside the i18n value:
                the shared link renderer defaults anchors to _self, and navigating
                away from the ballot discards every score the voter has entered. */}
            <Link href={ARTICLE_URL} target='_blank' rel='noreferrer'>
                {t('preliminary_results_notice.link_text')}
            </Link>
        </Typography>
    </ElectionStateWarning>
}
