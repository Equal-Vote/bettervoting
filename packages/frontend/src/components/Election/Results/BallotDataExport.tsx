import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ElectionResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import MenuItem from "@mui/material/MenuItem";
import BorderAll from '@mui/icons-material/BorderAll';
import DataObject from '@mui/icons-material/DataObject';
import { MenuButton } from '~/components/MenuButton';
import useAnonymizedBallots from '~/components/AnonymizedBallotsContextProvider';
import { buildElectionExport } from '@equal-vote/star-vote-shared/utils/exportFormat';
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

    // mode 'raw'      => keep a blank (null / not scored) as an empty cell, preserving the audit
    //                   trail (an empty cell stays distinct from an explicit 0). #1160 Option B.
    // mode 'official' => fill blanks with 0 so 3rd-party counting tools don't choke. #1160 Option A.
    const downloadCSV = (mode: 'raw' | 'official') => {
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

        const rows = ballots.map((ballot: any) => {
            const row: Record<string, string | number> = {
                ballot_id: ballot.ballot_id,
                precinct: ballot.precinct ?? '',
            };
            ballot.votes.forEach((vote: any) => {
                vote.scores.forEach((score: any) => {
                    // null / undefined = the voter didn't score this candidate.
                    // Raw keeps it blank (distinct from an explicit 0); Official fills 0.
                    row[`${vote.race_id}-${score.candidate_id}`] =
                        score.score ?? (mode === 'official' ? 0 : '');
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
            `Ballot Data - ${limit(election.title, 50)}-${election.election_id}-${mode}.csv`,
        );
    };

    const downloadJson = () => {
        const ballotObject = buildElectionExport(election, ballots, results);
        triggerDownload(
            JSON.stringify(ballotObject, null, 2),
            'application/json',
            `Ballot Data - ${limit(election.title, 50)}-${election.election_id}.json`,
        );
    };

    return (
        <a onClick={fetchBallots}>
            {/*The MenuButton is redundant between the 2 but it's necessary to resolve the 'Menu Component doesn't accept fragment as child' warning*/}
            {ballots &&
                <Box sx={{ m: 1, maxWidth: '400px' }}>
                    <MenuButton label={"Download"} >
                        <MenuItem key="csv-official" onClick={() => downloadCSV('official')}>
                            <BorderAll sx={{ marginRight: 1 }} />
                            Download CSV (Official Count)
                        </MenuItem>
                        <MenuItem key="csv-raw" onClick={() => downloadCSV('raw')}>
                            <BorderAll sx={{ marginRight: 1 }} />
                            Download CSV (Raw / Audit)
                        </MenuItem>
                        <MenuItem key="json" onClick={downloadJson}>
                            <DataObject sx={{ marginRight: 1 }} />
                            Download JSON
                        </MenuItem>
                    </MenuButton>
                </Box>
            }
            {!ballots &&
                <Box sx={{ m: 1, maxWidth: '400px' }}>
                    <MenuButton label={"Download"} >
                        <MenuItem disabled>Loading Ballots...</MenuItem>
                    </MenuButton>
                </Box>
            }
        </a>
    );
};
