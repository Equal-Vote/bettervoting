import { CSVLink } from 'react-csv';
import { useState } from 'react';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import MenuItem from "@mui/material/MenuItem";
import BorderAll from '@mui/icons-material/BorderAll';
import DataObject from '@mui/icons-material/DataObject';
import { MenuButton } from '~/components/MenuButton';
import useAnonymizedBallots from '~/components/AnonymizedBallotsContextProvider';
import { Box } from '@mui/material';

interface Props {
    election: Election;
}

export const BallotDataExport = ({ election }: Props) => {
    const [csvData, setCsvData] = useState<Record<string, string | number | boolean>[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<({
        label: string;
        key: string;
    }[] | {
        label: string;
        key: string;
    })[]>([]);
    const { ballots, fetchBallots } = useAnonymizedBallots();
    const downloadCSV = async () => {
        if (!ballots) return
        let header = [
            { label: 'ballot_id', key: 'ballot_id' },
            { label: 'precinct', key: 'precinct' },
            ...election.races.map((race) => [
                ...race.candidates.map((c) => ({
                    label: election.races.length == 1 ? c.candidate_name : `${race.title}!!${c.candidate_name}`,
                    key: `${race.race_id}-${c.candidate_id}`,
                })),
                ...((race.voting_method == 'IRV' || race.voting_method == 'STV')? [
                    {label:'overvote_rank', key: 'overvote_rank'},
                    {label:'has_duplicate_rank', key: 'has_duplicate_rank'},
                ]: [])
            ]),
        ];
        header = header.flat();
        const tempCsvData = ballots.map((ballot) => {
            const row = { ballot_id: ballot.ballot_id, precinct: ballot.precinct };
            ballot.votes.forEach((vote) => {
                vote.scores.forEach((score) => {
                    row[`${vote.race_id}-${score.candidate_id}`] = score.score;
                })
                const race = election.races.find(r => r.race_id == vote.race_id);
                if(race.voting_method == 'IRV' || race.voting_method == 'STV'){
                    row['overvote_rank'] = vote.overvote_rank ?? '';
                    row['has_duplicate_rank'] = vote.has_duplicate_rank ? 'TRUE' : 'FALSE';
                }
            });
            return row;
        });
        setCsvData(tempCsvData);
        setCsvHeaders(header);
        document.getElementById('csv-download-link')?.click();

    };

    const limit = (string = '', limit = 0) => {
        if (!string) return '';
        return string.substring(0, limit);
    };
    const downloadJson = async () => {
        const ballotObject = { Election: election, Ballots: ballots };
        const ballotJson = JSON.stringify(ballotObject, null, 2);
        const blob = new Blob([ballotJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ballot Data - ${limit(election.title, 50)}-${election.election_id}.json`;
        a.click();
    }
    return (
            <>
                <a onClick={fetchBallots}>
                    {/*The MenuButton is redundant between the 2 but it's necessary to resolve the 'Menu Component doesn't accept fragment as child' warning*/}
                    {ballots && 
                        <Box sx={{m:1, maxWidth: '400px'}}>
                            <MenuButton label={"Download"} >
                                <MenuItem key="csv"  id={"download-csv"} onClick={downloadCSV}>
                                    <BorderAll sx={{ marginRight: 1 }} />
                                    Download CSV
                                </MenuItem>
                                <MenuItem key="json" onClick={downloadJson}>
                                    <DataObject sx={{ marginRight: 1 }} />
                                    Download JSON
                                </MenuItem>
                            </MenuButton>
                        </Box>
                    }
                    {!ballots && 
                        <Box sx={{m:1, maxWidth: '400px'}}>
                            <MenuButton label={"Download"} >
                                <MenuItem disabled>Loading Ballots...</MenuItem>
                            </MenuButton>
                        </Box>
                    }
                </a>
                
                {csvData.length > 0 && (
                    //For some reason, CSVDownload doesn't allow you to set the filename, so we use CSVLink instead,
                    //but we hide it so it doesn't show up on the page.
                    //I couldn't get it work clicking on CSVLink directly because the download was starting before the state was set.
                    //This makes sure the download only starts when the state is set.
                    <CSVLink
                    id="csv-download-link"
                    data={csvData}
                    headers={csvHeaders}
                    
                    target="_blank"
                    filename={`Ballot Data - ${limit(election.title, 50)}-${election.election_id}.csv`}
                    enclosingCharacter={``}
                    style={{ display: 'none' }}
                />
                    )}
            </>
    );
};