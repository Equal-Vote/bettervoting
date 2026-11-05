import { useRef, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { DEFAULT_ALLOWED_SUBMIT_TYPES } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import {
    getBallotImportMode,
    ImportBallotsRequest,
    validateImportBallotsRequest,
} from "@equal-vote/star-vote-shared/domain_model/BallotImport";
import useElection from "~/components/ElectionContextProvider";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import { useImportBallots } from "~/hooks/useAPI";
import { ballotCsvTemplate, ParsedBallotCsv, ParsedVoterCsv, ParseResult, parseBallotCsv, parseVoterCsv } from "./ballotImportCsv";

type Loaded<T> = { fileName: string, result: ParseResult<T> };

const readFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid data type'));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
});

const FilePicker = ({ label, loaded, onLoad, disabled }: {
    label: string,
    loaded: Loaded<unknown> | null,
    onLoad: (fileName: string, text: string) => void,
    disabled: boolean,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return <Box>
        <input
            type='file'
            accept='.csv'
            hidden
            ref={inputRef}
            onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = ''; // so picking the same file again after editing it reloads it
                if (file) onLoad(file.name, await readFile(file));
            }}
        />
        <SecondaryButton fullWidth disabled={disabled} onClick={() => inputRef.current?.click()}>
            {loaded ? `${label}: ${loaded.fileName}` : `Select ${label}`}
        </SecondaryButton>
        {loaded && 'error' in loaded.result && <Alert severity='error' sx={{ mt: 1 }}>{loaded.result.error}</Alert>}
    </Box>;
};

// Admin page for importing paper (or otherwise externally collected) ballots into an open election.
// See BallotImport.ts in shared for the two contexts this page switches between.
export default function UploadBallots() {
    // the admin pages only render once the election exists, so it has an id
    const election = useElection().election as Election;
    const importBallots = useImportBallots(election.election_id);
    const [ballotFile, setBallotFile] = useState<Loaded<ParsedBallotCsv> | null>(null);
    const [voterFile, setVoterFile] = useState<Loaded<ParsedVoterCsv> | null>(null);
    const [lastResult, setLastResult] = useState<string | null>(null);

    const allowedTypes = election.settings.allowed_submit_types ?? DEFAULT_ALLOWED_SUBMIT_TYPES;
    if (!allowedTypes.includes('submitted_via_admin')) {
        return <Alert severity='info'>
            Paper ballot uploads are turned off for this election. They can be turned on under Manage Voters while the election is still a draft.
        </Alert>;
    }
    const isDraft = election.state === 'draft';
    if (!isDraft && election.state !== 'open') {
        return <Alert severity='info'>Ballots can be uploaded while the election is a draft (as test ballots) or open.</Alert>;
    }

    const usesRoll = getBallotImportMode(election.settings) === 'roll';
    // Settings validation keeps this from happening; it guards elections saved before that rule
    if (election.settings.ballot_updates) {
        return <Alert severity='warning'>
            Ballots cannot be uploaded to an election that lets voters edit their vote, because an uploaded voter has no ballot of their own to edit.
        </Alert>;
    }

    const downloadTemplate = () => {
        const url = URL.createObjectURL(new Blob([ballotCsvTemplate(election)], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ballot Template - ${election.election_id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    let request: ImportBallotsRequest | null = null;
    if (ballotFile?.result.ok && (!usesRoll || voterFile?.result.ok)) {
        request = {
            ...ballotFile.result.value,
            ...(usesRoll && voterFile?.result.ok ? voterFile.result.value : {}),
        };
    }
    // The same database-free checks the server runs, so most mistakes show up before uploading
    const validationError = request ? validateImportBallotsRequest(election, request) : null;

    const onUpload = async () => {
        if (!request || validationError) return;
        const res = await importBallots.makeRequest(request);
        if (!res) return;
        setLastResult(isDraft
            ? `${res.imported} test ballots uploaded. They will be deleted when you finalize the election.`
            : usesRoll
                ? `${res.imported} ballots uploaded and ${res.voters_marked} voters marked as having voted.`
                : `${res.imported} ballots uploaded.`);
        setBallotFile(null);
        setVoterFile(null);
    };

    const voterColumn = election.settings.invitation === 'email' ? 'email' : 'voter_id';

    return <Stack spacing={2} sx={{ maxWidth: 600 }}>
        {isDraft && <Alert severity='info'>
            This election is still a draft, so uploads are test ballots: they show up in the preview results and are deleted when you finalize.
            {usesRoll && ' The voter file is checked against the voter list, but no voters are marked as having voted.'}
        </Alert>}
        {usesRoll ? <>
            <Typography>
                This election has a voter list, so upload two files together: one with the ballots and one with the voters who cast them.
                The two files are never linked, so nobody can tell from BetterVoting which voter cast which ballot.
                Both files must have the same number of rows.
            </Typography>
            <Typography variant='body2'>
                Ballot file: a <code>ballot_id</code> column, an optional <code>precinct</code> column, and one column per candidate.
                Voter file: a single <code>{voterColumn}</code> column.
            </Typography>
        </> : <>
            <Typography>
                This election has no voter list in BetterVoting, so upload a single file with the ballots. Keep track of who voted outside BetterVoting.
            </Typography>
            <Typography variant='body2'>
                Ballot file: a <code>ballot_id</code> column, an optional <code>precinct</code> column, and one column per candidate.
            </Typography>
        </>}
        <Typography variant='body2'>
            Each upload is all or nothing: if any row has a problem, no ballots are added. Ballot ids must be new to this election.
        </Typography>

        <SecondaryButton onClick={downloadTemplate}>Download ballot file template</SecondaryButton>
        <FilePicker
            label='ballot file'
            loaded={ballotFile}
            disabled={importBallots.isPending}
            onLoad={(fileName, text) => { setLastResult(null); setBallotFile({ fileName, result: parseBallotCsv(text, election) }); }}
        />
        {usesRoll && <FilePicker
            label='voter file'
            loaded={voterFile}
            disabled={importBallots.isPending}
            onLoad={(fileName, text) => { setLastResult(null); setVoterFile({ fileName, result: parseVoterCsv(text) }); }}
        />}

        {request && (validationError
            ? <Alert severity='error'>{validationError}</Alert>
            : <Alert severity='info'>
                {`Ready to upload ${request.ballots.length} ballots`}
                {isDraft ? ' as test ballots' : usesRoll && ` and mark ${request.voter_ids?.length ?? 0} voters as having voted`}.
            </Alert>
        )}
        {lastResult && <Alert severity='success'>{lastResult}</Alert>}

        <PrimaryButton disabled={!request || !!validationError || importBallots.isPending} onClick={onUpload}>
            Upload ballots
        </PrimaryButton>
    </Stack>;
}
