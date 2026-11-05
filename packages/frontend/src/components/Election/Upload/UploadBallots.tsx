import { useRef, useState } from "react";
import {
    Alert, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider,
    Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { acceptsUploadedBallots } from "@equal-vote/star-vote-shared/domain_model/ElectionSettings";
import { methodValueToTextKey } from "@equal-vote/star-vote-shared/domain_model/Race";
import {
    getBallotImportMode,
    ImportBallotsRequest,
    markRule,
    validateImportBallotsRequest,
} from "@equal-vote/star-vote-shared/domain_model/BallotImport";
import useElection from "~/components/ElectionContextProvider";
import useConfirm from "~/components/ConfirmationDialogProvider";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import { useSubstitutedTranslation } from "~/components/util";
import { useDeleteUploadedBallots, useImportBallots } from "~/hooks/useAPI";
import {
    ballotCsvColumns,
    ballotCsvLayoutProblem,
    ballotCsvTemplate,
    ballotCsvTemplateHeaders,
    CsvProblem,
    ParsedBallotCsv,
    ParsedVoterCsv,
    ParseResult,
    parseBallotCsv,
    parseVoterCsv,
    RaceColumns,
    TEMPLATE_WRITE_IN_PAIRS,
} from "./ballotImportCsv";

const HELP_URL = 'https://docs.bettervoting.com/help/uploading_ballots.html';
// a file with thousands of bad rows shouldn't render thousands of table rows
const PROBLEMS_SHOWN = 25;
const DELETE_PHRASE = 'delete all uploaded ballots';

type Loaded<T> = { fileName: string, result: ParseResult<T> };

const readFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid data type'));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
});

const ProblemList = ({ fileName, problems }: { fileName: string, problems: CsvProblem[] }) => {
    const located = problems.some(p => p.row !== undefined || p.column !== undefined);
    return <Alert severity='error' sx={{ mt: 1, '& .MuiAlert-message': { width: '100%', overflowX: 'auto' } }}>
        <Typography variant='body2' sx={{ mb: located ? 1 : 0 }}>
            {problems.length === 1 ? `${fileName} has a problem` : `${fileName} has ${problems.length} problems`}. Fix {problems.length === 1 ? 'it' : 'them'} and select the file again.
            {!located && <><br/>{problems[0].message}</>}
        </Typography>
        {located && <Table size='small' aria-label='Problems in the file'>
            <TableHead><TableRow>
                <TableCell>Row</TableCell><TableCell>Ballot</TableCell><TableCell>Column</TableCell><TableCell>Problem</TableCell>
            </TableRow></TableHead>
            <TableBody>
                {problems.slice(0, PROBLEMS_SHOWN).map((p, i) => <TableRow key={i}>
                    <TableCell>{p.row ?? ''}</TableCell>
                    <TableCell>{p.ballot_id ?? ''}</TableCell>
                    <TableCell>{p.column && <code>{p.column}</code>}</TableCell>
                    <TableCell>{p.message}</TableCell>
                </TableRow>)}
            </TableBody>
        </Table>}
        {problems.length > PROBLEMS_SHOWN && <Typography variant='body2' sx={{ mt: 1 }}>…and {problems.length - PROBLEMS_SHOWN} more.</Typography>}
    </Alert>;
};

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
        {loaded && loaded.result.ok === false && <ProblemList fileName={loaded.fileName} problems={loaded.result.problems} />}
    </Box>;
};

const RANKED = ['IRV', 'STV', 'RankedRobin'];

// Marks that are valid for the race, so the example row on the page is one that uploads.
// A write-in race shows one write-in where it can't clash with the marks (not choose-one,
// not ranked, where it would need a rank of its own).
function exampleCells(rc: RaceColumns, maxRankings?: number): string[] {
    const n = rc.candidates.length;
    const method = rc.race.voting_method;
    const marks = method === 'STAR' || method === 'STAR_PR' ? rc.candidates.map((_, i) => String([5, 3, 0, 4, 1, 2][i % 6]))
        : method === 'Approval' ? rc.candidates.map((_, i) => i % 2 === 0 ? '1' : '')
        : method === 'Plurality' ? rc.candidates.map((_, i) => i === 0 ? '1' : '')
        : rc.candidates.map((_, i) => i < Math.min(n, maxRankings ?? n, 3) ? String(i + 1) : '');
    if (!rc.race.enable_write_in) return marks;
    const showWriteIn = method !== 'Plurality' && !RANKED.includes(method);
    const first = showWriteIn ? ['Pat Writein', method === 'Approval' ? '1' : '2'] : ['', ''];
    return [...marks, ...first, ...Array(2 * (TEMPLATE_WRITE_IN_PAIRS - 1)).fill('')];
}

const csvCell = (s: string) => /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

const exampleCsv = (election: Election, columns: RaceColumns[]) =>
    [ballotCsvTemplateHeaders(election), ['P-0001', '', ...columns.flatMap(rc => exampleCells(rc, election.settings.max_rankings))]]
        .map(r => r.map(csvCell).join(',')).join('\n');

// What goes in each column, built from this election's races
const HowToFillIn = ({ election }: { election: Election }) => {
    const { t } = useSubstitutedTranslation(election.settings.term_type);
    const columns = ballotCsvColumns(election);
    const anyWriteIns = columns.some(rc => rc.race.enable_write_in);
    return <Box>
        <Typography variant='h6' component='h3'>How to fill in the ballot file</Typography>
        <Typography variant='body2' sx={{ mb: 1 }}>
            One row per paper ballot. <code>ballot_id</code> is your id for the ballot, for example the number printed on it:
            required, up to 64 characters, and new to this election. <code>precinct</code> can be left blank unless races are limited to precincts.
            Then one column per candidate:
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
            <Table size='small' aria-label='What to write for each race'>
                <TableHead><TableRow>
                    <TableCell>Race</TableCell><TableCell>Voting method</TableCell><TableCell>In each candidate&apos;s column</TableCell><TableCell>A blank cell means</TableCell>
                </TableRow></TableHead>
                <TableBody>
                    {columns.map(rc => {
                        const rule = markRule(rc.race, election.settings.max_rankings);
                        return <TableRow key={rc.race.race_id}>
                            <TableCell>
                                {rc.race.title}
                                <Typography variant='caption' component='div' color='text.secondary'>
                                    {rc.candidates.map((c, i) => <span key={c.candidate_id}>{i > 0 && ', '}<code>{c.header}</code></span>)}
                                    {rc.race.enable_write_in && <>, then write-in pairs</>}
                                </Typography>
                            </TableCell>
                            <TableCell>{t(`methods.${methodValueToTextKey[rc.race.voting_method]}.short_name`)}</TableCell>
                            <TableCell>
                                {rule.summary}
                                {rc.race.voting_method === 'Plurality' && ', and mark at most one'}
                            </TableCell>
                            <TableCell>{rule.blank}</TableCell>
                        </TableRow>;
                    })}
                </TableBody>
            </Table>
        </Box>
        {anyWriteIns && <Typography variant='body2' sx={{ mt: 1 }}>
            Races that take write-ins have pairs of columns: <code>write_in_1</code> for the written-in name and <code>write_in_1_mark</code> for
            its mark, which follows the same rule as the candidates. Leave both blank if nobody was written in.
            The template has {TEMPLATE_WRITE_IN_PAIRS} pairs per race; add <code>write_in_3</code> and <code>write_in_3_mark</code> and so on for more.
            Written-in names show up for review with the online write-ins.
        </Typography>}
        <Typography variant='body2' sx={{ mt: 1 }}>An example row that would upload:</Typography>
        <Box component='pre' sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, overflowX: 'auto', fontSize: '0.8rem', m: 0 }}>
            {exampleCsv(election, columns)}
        </Box>
        <Typography variant='body2' sx={{ mt: 1 }}>
            More in the <Link href={HELP_URL} target='_blank' rel='noopener'>guide to uploading ballots</Link>.
        </Typography>
    </Box>;
};

// Typing the phrase is the point: this withdraws ballots that count
const DeleteUploadsDialog = ({ open, onClose, onConfirm, pending }: {
    open: boolean, onClose: () => void, onConfirm: () => void, pending: boolean,
}) => {
    const [typed, setTyped] = useState('');
    const matches = typed.trim().toLowerCase() === DELETE_PHRASE;
    const close = () => { setTyped(''); onClose(); };
    return <Dialog open={open} onClose={pending ? undefined : close} fullWidth>
        <DialogTitle>Delete all uploaded ballots?</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Every ballot uploaded to this election is withdrawn, and voters the uploads marked as having voted go back to not having voted.
                Ballots cast online are kept. The deletion is recorded in the election&apos;s audit log. This cannot be undone.
            </DialogContentText>
            <DialogContentText sx={{ mt: 2 }}>Type <b>{DELETE_PHRASE}</b> to confirm.</DialogContentText>
            <TextField
                fullWidth margin='dense' value={typed} onChange={e => setTyped(e.target.value)}
                slotProps={{ htmlInput: { 'aria-label': 'Confirmation phrase' } }}
                onKeyDown={e => { if (e.key === 'Enter' && matches && !pending) onConfirm(); }}
            />
        </DialogContent>
        <DialogActions>
            <SecondaryButton fullWidth={false} onClick={close} disabled={pending}>Cancel</SecondaryButton>
            <PrimaryButton fullWidth={false} onClick={() => { setTyped(''); onConfirm(); }} disabled={!matches || pending}>
                Delete uploaded ballots
            </PrimaryButton>
        </DialogActions>
    </Dialog>;
};

const stripRequestPrefix = (message: string) => message.replace(/^Error making request: \d+: /, '');

// Admin page for importing paper (or otherwise externally collected) ballots into an open election.
// See BallotImport.ts in shared for the two contexts this page switches between.
export default function UploadBallots() {
    // the admin pages only render once the election exists, so it has an id
    const election = useElection().election as Election;
    const importBallots = useImportBallots(election.election_id);
    const deleteUploads = useDeleteUploadedBallots(election.election_id);
    const confirm = useConfirm();
    const [ballotFile, setBallotFile] = useState<Loaded<ParsedBallotCsv> | null>(null);
    const [voterFile, setVoterFile] = useState<Loaded<ParsedVoterCsv> | null>(null);
    const [lastResult, setLastResult] = useState<string | null>(null);
    // which request's error is on screen; cleared when a file is picked again
    const [failed, setFailed] = useState<'upload' | 'delete' | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    if (!acceptsUploadedBallots(election.settings)) {
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
    const layoutProblem = ballotCsvLayoutProblem(election);
    const busy = importBallots.isPending || deleteUploads.isPending;

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
        const count = request.ballots.length;
        const ok = await confirm({
            title: `Upload ${count} ${count === 1 ? 'ballot' : 'ballots'}?`,
            message: isDraft
                ? `These are test ballots: they're deleted when you finalize the election.`
                : `They count in the results${usesRoll ? `, and ${request.voter_ids?.length ?? 0} voters are marked as having voted` : ''}. This cannot be undone without deleting all uploaded ballots.`,
            submit: 'Upload',
        });
        if (!ok) return;
        setFailed(null);
        const res = await importBallots.makeRequest(request);
        if (!res) { setFailed('upload'); return; }
        setLastResult(isDraft
            ? `${res.imported} test ballots uploaded. They will be deleted when you finalize the election.`
            : usesRoll
                ? `${res.imported} ballots uploaded and ${res.voters_marked} voters marked as having voted.`
                : `${res.imported} ballots uploaded.`);
        setBallotFile(null);
        setVoterFile(null);
    };

    const onDelete = async () => {
        setFailed(null);
        const res = await deleteUploads.makeRequest();
        setDeleteOpen(false);
        if (!res) { setFailed('delete'); return; }
        setLastResult(res.deleted === 0
            ? 'There were no uploaded ballots to delete.'
            : `${res.deleted} uploaded ballots deleted${res.voters_unmarked > 0 ? ` and ${res.voters_unmarked} voters marked as not having voted` : ''}.`);
    };

    const picked = () => { setLastResult(null); setFailed(null); };
    const voterColumn = election.settings.invitation === 'email' ? 'email' : 'voter_id';
    const failure = failed === 'upload' ? importBallots.error : failed === 'delete' ? deleteUploads.error : null;

    return <Stack spacing={2} sx={{ maxWidth: 720 }}>
        {isDraft && <Alert severity='info'>
            This election is still a draft, so uploads are test ballots: they show up in the preview results and are deleted when you finalize.
            {usesRoll && ' The voter file is checked against the voter list, but no voters are marked as having voted.'}
        </Alert>}
        {usesRoll ? <Typography>
            This election has a voter list, so upload two files together: one with the ballots and one with the voters who cast them.
            The two files are never linked, so nobody can tell from BetterVoting which voter cast which ballot.
            Both files must have the same number of rows. The voter file has a single <code>{voterColumn}</code> column.
        </Typography> : <Typography>
            This election has no voter list in BetterVoting, so upload a single file with the ballots. Keep track of who voted outside BetterVoting.
        </Typography>}
        <Typography variant='body2'>
            Each upload is all or nothing: if any row has a problem, no ballots are added.
        </Typography>

        {layoutProblem ? <Alert severity='warning'>{layoutProblem}</Alert> : <>
            <HowToFillIn election={election} />
            <SecondaryButton onClick={downloadTemplate}>Download ballot file template</SecondaryButton>
        </>}
        <FilePicker
            label='ballot file'
            loaded={ballotFile}
            disabled={busy || !!layoutProblem}
            onLoad={(fileName, text) => { picked(); setBallotFile({ fileName, result: parseBallotCsv(text, election) }); }}
        />
        {usesRoll && <FilePicker
            label='voter file'
            loaded={voterFile}
            disabled={busy || !!layoutProblem}
            onLoad={(fileName, text) => { picked(); setVoterFile({ fileName, result: parseVoterCsv(text) }); }}
        />}

        {request && (validationError
            ? <Alert severity='error'>{validationError}</Alert>
            : <Alert severity='info'>
                {`Ready to upload ${request.ballots.length} ballots`}
                {isDraft ? ' as test ballots' : usesRoll && ` and mark ${request.voter_ids?.length ?? 0} voters as having voted`}.
            </Alert>
        )}
        {failure && <Alert severity='error'>
            {failed === 'upload' ? 'Nothing was uploaded.' : 'Nothing was deleted.'} {stripRequestPrefix(failure)}
        </Alert>}
        {lastResult && <Alert severity='success'>{lastResult}</Alert>}

        <PrimaryButton disabled={!request || !!validationError || busy} onClick={onUpload}>
            Upload ballots
        </PrimaryButton>

        <Divider />
        <Typography variant='h6' component='h3'>Made a mistake?</Typography>
        <Typography variant='body2'>
            Delete every uploaded ballot, then upload corrected files. The same ballot ids can be used again.
        </Typography>
        <SecondaryButton disabled={busy} onClick={() => setDeleteOpen(true)}>Delete all uploaded ballots</SecondaryButton>
        <DeleteUploadsDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={onDelete} pending={deleteUploads.isPending} />
    </Stack>;
}
