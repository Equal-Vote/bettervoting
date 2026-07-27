import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ElectionResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import MenuItem from "@mui/material/MenuItem";
import BorderAll from '@mui/icons-material/BorderAll';
import DataObject from '@mui/icons-material/DataObject';
import { MenuButton } from '~/components/MenuButton';
import useAnonymizedBallots from '~/components/AnonymizedBallotsContextProvider';
import { Box } from '@mui/material';

interface Props {
    election: Election;
    results?: ElectionResults[];
}

export const BallotDataExport = ({ election, results }: Props) => {
    const { ballots, fetchBallots } = useAnonymizedBallots();

    const limit = (string = '', limit = 0) => {
        if (!string) return '';
        return string.substring(0, limit);
    };

    const triggerDownload = (contents: string, mime: string, filename: string) => {
        const blob = new Blob([contents], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // RFC-4180 field escaping (quote only when needed).
    const csvField = (v: unknown) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const downloadCSV = () => {
        if (!ballots) return;
        const header = [
            { label: 'ballot_id', key: 'ballot_id' },
            { label: 'precinct', key: 'precinct' },
            ...election.races.map((race) => [
                ...race.candidates.map((c) => ({
                    label: election.races.length == 1 ? c.candidate_name : `${race.title}!!${c.candidate_name}`,
                    key: `${race.race_id}-${c.candidate_id}`,
                })),
                ...((race.voting_method == 'IRV' || race.voting_method == 'STV') ? [
                    { label: 'overvote_rank', key: 'overvote_rank' },
                    { label: 'has_duplicate_rank', key: 'has_duplicate_rank' },
                ] : []),
            ]),
        ].flat();

        const rows = ballots.map((ballot) => {
            const row: Record<string, string | number> = {
                ballot_id: ballot.ballot_id,
                precinct: ballot.precinct ?? '',
            };
            ballot.votes.forEach((vote) => {
                vote.scores.forEach((score) => {
                    // null / undefined = the voter didn't score this candidate;
                    // keep it as a blank cell, distinct from an explicit 0.
                    row[`${vote.race_id}-${score.candidate_id}`] = score.score ?? '';
                });
                const race = election.races.find((r) => r.race_id == vote.race_id);
                if (race && (race.voting_method == 'IRV' || race.voting_method == 'STV')) {
                    row['overvote_rank'] = vote.overvote_rank ?? '';
                    row['has_duplicate_rank'] = vote.has_duplicate_rank ? 'TRUE' : 'FALSE';
                }
            });
            return row;
        });

        const lines = [
            header.map((h) => csvField(h.label)).join(','),
            ...rows.map((row) => header.map((h) => csvField(row[h.key])).join(',')),
        ];
        triggerDownload(
            lines.join('\r\n'),
            'text/csv;charset=utf-8;',
            `Ballot Data - ${limit(election.title, 50)}-${election.election_id}.csv`,
        );
    };

    const downloadJson = () => {
        const ballotObject = { Election: election, Ballots: ballots, ...(results && { Results: results }) };
        triggerDownload(
            JSON.stringify(ballotObject, null, 2),
            'application/json',
            `Ballot Data - ${limit(election.title, 50)}-${election.election_id}.json`,
        );
    };

    return (
        <a onClick={fetchBallots}>
            {/* A single MenuButton must stay mounted while the ballots load: swapping in a
                second one on load unmounts the open menu mid-click. Only the items change.
                (An array of items rather than a fragment, since Menu rejects fragment children.) */}
            <Box sx={{ m: 1, maxWidth: '400px' }}>
                <MenuButton label={"Download"} >
                    {!ballots ? <MenuItem disabled>Loading Ballots...</MenuItem> : [
                        <MenuItem key="csv" id={"download-csv"} onClick={downloadCSV}>
                            <BorderAll sx={{ marginRight: 1 }} />
                            Download CSV
                        </MenuItem>,
                        <MenuItem key="json" onClick={downloadJson}>
                            <DataObject sx={{ marginRight: 1 }} />
                            Download JSON
                        </MenuItem>,
                    ]}
                </MenuButton>
            </Box>
        </a>
    );
};
