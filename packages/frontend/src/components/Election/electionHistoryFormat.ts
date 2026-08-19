import { HistoryEvent } from '../../hooks/useAPI';

/**
 * Formatting for the public audit log, kept in its own module so EnhancedTable's
 * head cell pool can use it without importing the view (which imports the table).
 */

// These labels double as EnhancedTable's group-filter keys and as the lookup
// used by getStateColor for the chip colour, so they're deliberately plain
// English rather than translated — same as the other group-filtered columns.
const HISTORY_LABELS: Record<HistoryEvent['type'], string> = {
    state_change: 'State',
    preliminary_results_change: 'Preliminary Results',
    ballots_milestone: 'Ballots',
    upload_ballots: 'Ballots Uploaded',
    ballots_edited_milestone: 'Ballot Edits',
    voter_id_revealed: 'Voter ID Revealed',
};

export const historyChipLabel = (type: HistoryEvent['type']): string =>
    HISTORY_LABELS[type] ?? type;

// Derived rather than repeated: a group-filter key that didn't match a label
// would silently filter every row of that type out of the table.
export const historyFilterGroups = (): { [label: string]: boolean } =>
    Object.fromEntries(Object.values(HISTORY_LABELS).map(label => [label, true]));

export const describeHistoryEvent = (event: HistoryEvent, t: (k: string, v?: object) => string): string => {
    switch (event.type) {
        case 'state_change':
            return event.from === null
                ? t('election_history.desc.state_initial', { to: event.to })
                : t('election_history.desc.state_change', { from: event.from, to: event.to });
        case 'preliminary_results_change':
            return event.to
                ? t('election_history.desc.preliminary_on')
                : t('election_history.desc.preliminary_off');
        case 'ballots_milestone':
            return t('election_history.desc.ballots_milestone', { count: event.count });
        case 'upload_ballots':
            return t('election_history.desc.upload_ballots', { count: event.count });
        case 'ballots_edited_milestone':
            return t('election_history.desc.edits_milestone', { count: event.count });
        case 'voter_id_revealed':
            return t('election_history.desc.voter_revealed');
        default:
            return '';
    }
};

// Ballot- and voter-related events arrive truncated to the UTC day; admin state
// changes keep their exact time. Both are rendered in UTC, in a form that sorts
// lexicographically — EnhancedTable sorts on the formatted cell value, and
// locale-formatted dates would neither sort nor round-trip through Date()
// reliably outside en-US. The column header says UTC.
const DAY_TRUNCATED: HistoryEvent['type'][] = [
    'ballots_milestone',
    'upload_ballots',
    'ballots_edited_milestone',
    'voter_id_revealed',
];

export const formatHistoryTimestamp = (event: HistoryEvent): string =>
    DAY_TRUNCATED.includes(event.type)
        ? event.timestamp.slice(0, 10)                       // 2026-01-05
        : event.timestamp.slice(0, 16).replace('T', ' ');    // 2026-01-05 14:32
