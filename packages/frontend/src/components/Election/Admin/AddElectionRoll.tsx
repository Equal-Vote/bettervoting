import { useState, useRef, useEffect } from "react"
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import { Checkbox, FormGroup, FormControlLabel } from '@mui/material';
import Papa from "papaparse";
import LinearProgress from "@mui/material/LinearProgress";
import { useGetRolls } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import useSnackbar from "../../SnackbarContext";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import { sharedConfig } from '@equal-vote/star-vote-shared/config';
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import useConfirm from '../../ConfirmationDialogProvider';
import { findRollConflicts, uploadRollsBatched, RollInput } from './rollUploadUtils';


const AddElectionRoll = ({ onClose, onUploadingChange }: { onClose: () => void, onUploadingChange?: (uploading: boolean) => void }) => {
    const { setSnack } = useSnackbar()
    const flags = useFeatureFlags();
    const { election } = useElection()
    const [voterIDList, setVoterIDList] = useState('')
    const getRolls = useGetRolls(election.election_id)
    const [enableVoterID, setEnableVoterID] = useState(election.settings.voter_authentication.voter_id && election.settings.invitation !== 'email')
    const emailListOnly = election.settings.invitation === 'email'
    const [enableEmail, setEnableEmail] = useState(emailListOnly)
    const [enablePrecinct, setEnablePrecinct] = useState(false)
    const [busy, setBusy] = useState(false)
    const [progress, setProgress] = useState<{ uploaded: number, total: number } | null>(null)
    const inputRef = useRef(null)
    const confirm = useConfirm();

    useEffect(() => { onUploadingChange?.(busy) }, [busy])

    const allowedColumns = [];
    if(enableVoterID) allowedColumns.push('voter_id')
    if(enableEmail) allowedColumns.push('email')
    if(enablePrecinct) allowedColumns.push('precinct')

    const showError = (message: string) => setSnack({
        message,
        severity: "error",
        open: true,
        autoHideDuration: null
    })

    // Shared by the text field and the csv upload
    // 1. fetch the current roll so we can find conflicts (voters that are already on the list, or that repeat within this upload)
    // 2. confirm with the admin (always for csv files, otherwise only when there are conflicts to skip)
    // 3. upload in batches
    const submitRolls = async (rolls: RollInput[], alwaysConfirm: boolean) => {
        setBusy(true)
        try {
            const existing = await getRolls.makeRequest()
            if (!existing) return // useFetch already reported the error

            const conflicts = findRollConflicts(existing.electionRoll, rolls)
            const skippedCount = conflicts.existingCount + conflicts.fileCount
            const uploadCount = conflicts.rolls.length

            if (uploadCount === 0) {
                showError(rolls.length === 0 ? 'No voters found to upload' : 'All of these voters are already on your voter list')
                return
            }

            if (election.settings.voter_access == 'closed') {
                const overrides = sharedConfig.ELECTION_VOTER_LIMIT_OVERRIDES as { [key: string]: number };
                const voterLimit = overrides[election.election_id] ?? sharedConfig.FREE_TIER_PRIVATE_VOTER_LIMIT;
                if (existing.electionRoll.length + uploadCount > voterLimit) {
                    showError(`Request Denied: this election is limited to ${voterLimit} voters (${existing.electionRoll.length} already added, ${uploadCount} new)`)
                    return
                }
            }

            if (skippedCount > 0 || alwaysConfirm) {
                const skipDetails = [
                    conflicts.existingCount > 0 && `${conflicts.existingCount} already on your voter list`,
                    conflicts.fileCount > 0 && `${conflicts.fileCount} repeated within your upload`,
                ].filter(Boolean).join(' and ')
                const confirmed = await confirm({
                    title: skippedCount > 0 ? 'Some voters will be skipped' : `Upload ${uploadCount} voters?`,
                    message: skippedCount > 0
                        ? `${skipDetails} will be skipped because they have a conflicting voter ID or email. Continue uploading the remaining ${uploadCount} voters?`
                        : `${uploadCount} voters will be added to your voter list.`,
                    submit: `Upload ${uploadCount} voters`,
                    cancel: 'Cancel',
                })
                if (!confirmed) return
            }

            setProgress({ uploaded: 0, total: uploadCount })
            const result = await uploadRollsBatched(
                election.election_id,
                conflicts.rolls,
                (uploaded, total) => setProgress({ uploaded, total })
            )

            if (result.aborted) {
                showError(`Upload stopped after adding ${result.uploaded} of ${uploadCount} voters: ${result.errorMessage}. Refresh the page and re-upload the same list to continue, voters that were already added will be skipped.`)
                return
            }
            setSnack({
                message: `Added ${uploadCount} voters`,
                severity: 'success',
                open: true,
                autoHideDuration: 6000,
            })
            onClose()
        } finally {
            setBusy(false)
            setProgress(null)
        }
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        // delimiter is fixed at ',' rather than auto-detected: with a single enabled column (e.g. voter ID only)
        // there's no comma to detect, and PapaParse's auto-detection reports that as a (non-fatal) error
        const parsed = Papa.parse<string[]>(voterIDList, { skipEmptyLines: 'greedy', delimiter: ',' })
        if (parsed.errors.length > 0) {
            showError(`Unable to read voter data: ${parsed.errors[0].message}`)
            return
        }

        const expectedCounts = Number(enableVoterID) + Number(enableEmail) + Number(enablePrecinct)
        const rolls: RollInput[] = []
        for (const row of parsed.data) {
            if (row.length !== expectedCounts) {
                showError(`Incorrect number of columns: ${row.join(',')}`)
                return
            }
            let count = 0
            const roll: RollInput = { state: 'approved' }
            if (enableVoterID && !emailListOnly) roll.voter_id = row[count++].trim()
            if (enableEmail) roll.email = row[count++].trim()
            if (enablePrecinct) roll.precinct = row[count++].trim()
            rolls.push(roll)
        }

        await submitRolls(rolls, false)
    }

    const handleLoadCsv = (e) => {
        e.preventDefault()
        const file = e.target.files[0]
        e.target.value = '' // so that picking the same file again still triggers onChange
        if (!file) return

        const fileReader = new FileReader()
        fileReader.onload = async function (event) {
            const text = event.target.result;
            if (typeof text !== "string") {
                showError('Invalid data type')
                return
            }
            const parsed = Papa.parse<Record<string, string>>(text, {
                header: true,
                skipEmptyLines: 'greedy',
                transformHeader: (h) => h.trim(),
            })
            const parseErrors = parsed.errors.filter(error => error.type !== 'Delimiter')
            if (parseErrors.length > 0) {
                showError(`Unable to read voter data: ${parseErrors[0].message}`)
                return
            }
            const headers = parsed.meta.fields ?? []
            if (headers.length === 0 || !headers.every(val => ['voter_id', 'email', 'precinct'].includes(val))) {
                showError('Invalid headers')
                return
            }
            const rolls: RollInput[] = parsed.data
                .map(row => ({
                    state: 'approved',
                    voter_id: row.voter_id?.trim(),
                    email: row.email?.trim(),
                    precinct: row.precinct?.trim(),
                }))
                // Filter out rolls where all fields are empty
                .filter(roll => roll.voter_id || roll.email || roll.precinct)

            await submitRolls(rolls, true)
        };
        fileReader.readAsText(file);
    }


    return (
        <form onSubmit={onSubmit}>
            <Container maxWidth='sm'>
                <Grid container sx={{ flexDirection: 'column' }} >

                    <Typography align='center' gutterBottom variant="h6" component="h6">
                        Enter voter data
                    </Typography>

                    <Typography align='center' component="p">
                        Enter your voter roll data in the field below.<br/>{`(1 ${emailListOnly ? "email" : "voter"} per row, no spaces)`}
                    </Typography>

                    { election.settings.voter_access == 'closed' && 
                        <Typography align='center' component="p">
                        { election.election_id in sharedConfig.ELECTION_VOTER_LIMIT_OVERRIDES?
                            `* Your election is approved for ${sharedConfig.ELECTION_VOTER_LIMIT_OVERRIDES[election.election_id]} voters`
                        :
                            `* Free tier elections are limited to ${sharedConfig.FREE_TIER_PRIVATE_VOTER_LIMIT} voters, email us at elections@equal.vote for an override`
                        }
                        </Typography>
                    }

                    <Grid sx={{ p: 1 }}>
                        <FormGroup row>
                            {
                                emailListOnly ||
                                    <>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    id="enable-voter-id"
                                                    name="Voter ID"
                                                    checked={enableVoterID}
                                                    onChange={(e) => setEnableVoterID(e.target.checked)} />
                                            }
                                            label='Voter ID'
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    id="enable-email"
                                                    name="Email"
                                                    checked={enableEmail}
                                                    onChange={(e) => setEnableEmail(e.target.checked)} />
                                            }
                                            label='Email'
                                        />
                                    </>
                            }
                            {flags.isSet('PRECINCTS') &&
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            id="enable-precinct"
                                            name="Precinct"
                                            checked={enablePrecinct}
                                            onChange={(e) => setEnablePrecinct(e.target.checked)} />
                                    }
                                    label='Precinct'
                                />
                            }
                        </FormGroup>
                    </Grid>
                    <Grid sx={{ p: 1 }}>
                        <TextField id="email-list" name="email-list" label={`Voter ${emailListOnly ? "Emails" : "Data"}`} required rows={3} placeholder={
                                (enableVoterID || enableEmail || enablePrecinct ? 
                                    //https://stackoverflow.com/questions/5501581/why-does-the-map-method-apparently-not-work-on-arrays-created-via-new-arrayc
                                    new Array(2).fill(undefined).map((_, i) => {
                                        const a = [];
                                        if(enableVoterID) a.push(`id${i+1}`)
                                        if(enableEmail) a.push(`email${i+1}`)
                                        if(enablePrecinct) a.push(`precinct${i+1}`)
                                        return a.join(',');
                                    }).join("\n")+"\netc"
                                :
                                    '(pick at least one field)'
                                )
                            } multiline fullWidth type="text" value={voterIDList} onChange={(e) => setVoterIDList(e.target.value)} slotProps={{ inputLabel: {
                                shrink: true
                            } }}/>
                    </Grid>

                    <Grid sx={{ m: 1 }}>
                        <PrimaryButton
                            fullWidth
                            type='submit'
                            disabled={busy} >
                            Submit
                        </PrimaryButton>
                    </Grid>
                    <Grid sx={{ my: 1 }}>
                        <Divider />
                    </Grid>
                    <Grid sx={{ m: 1 }}>
                        <Typography align='center' gutterBottom variant="h5" component="h5">
                            OR
                        </Typography>
                        <Typography align='center' gutterBottom variant="h6" component="h6">
                            Upload CSV
                        </Typography>
                        <Typography align='center' component="p">
                            Upload a csv file of your voter data. Files must include the following headers: {
                                allowedColumns.map((h) => (h)).join(', ')
                            }
                        </Typography>
                    </Grid>
                    <Grid sx={{ m: 1 }}>
                        <Box sx={{ justifyContent: 'center', alignItems: 'center' }}>
                            <input
                                type='file'
                                accept={'.csv'}
                                onChange={handleLoadCsv}
                                hidden
                                ref={inputRef} />
                            <SecondaryButton
                                fullWidth
                                disabled={busy}
                                onClick={() => inputRef.current.click()} >
                                <Typography variant="h6" component="h6">
                                    Select File
                                </Typography>
                            </SecondaryButton>
                        </Box>
                    </Grid>
                    {progress && <Grid sx={{ m: 1 }}>
                        <LinearProgress variant='determinate' value={progress.total ? 100 * progress.uploaded / progress.total : 0} />
                        <Typography align='center' component="p">
                            {`Uploading ${progress.uploaded}/${progress.total} voters...`}
                        </Typography>
                    </Grid>}
                </Grid>
            </Container >

        </form >
    )
}

export default AddElectionRoll 
