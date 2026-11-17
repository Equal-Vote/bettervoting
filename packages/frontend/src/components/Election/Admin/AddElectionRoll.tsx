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
import { pricingConfig } from '@equal-vote/star-vote-shared/config';
import { ElectionEntitlements } from '@equal-vote/star-vote-shared/domain_model/Entitlement';
import { itemize } from '@equal-vote/star-vote-shared/domain_model/ProductCatalog';
import { formatCount } from '@equal-vote/star-vote-shared/utils/numberFormat';
import { useGetRolls } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import useSnackbar from "../../SnackbarContext";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import { PrimaryButton, SecondaryButton } from "~/components/styles";
import useConfirm from '../../ConfirmationDialogProvider';
import { findRollConflicts, uploadRollsBatched, RollInput } from './rollUploadUtils';
import { useCheckout } from './Payments/useCheckout';
import UploadPaymentDialog, { UploadPayment } from './Payments/UploadPaymentDialog';
import AddVotersPricingNote from './Payments/AddVotersPricingNote';
import PaymentReceivedBanner from './Payments/PaymentReceivedBanner';


interface AddElectionRollProps {
    onClose: () => void,
    onUploadingChange?: (uploading: boolean) => void,
    paymentReceived?: boolean, // back from paying for an over-limit upload
}

const AddElectionRoll = ({ onClose, onUploadingChange, paymentReceived = false }: AddElectionRollProps) => {
    const { setSnack } = useSnackbar()
    const flags = useFeatureFlags();
    const paymentsEnabled = flags.isSet('PAYMENTS')
    const { election, entitlements, updateElection, refreshElection } = useElection()
    const [voterIDList, setVoterIDList] = useState('')
    const getRolls = useGetRolls(election.election_id)
    const [enableVoterID, setEnableVoterID] = useState(election.settings.voter_authentication.voter_id && election.settings.invitation !== 'email')
    const emailListOnly = election.settings.invitation === 'email'
    const [enableEmail, setEnableEmail] = useState(emailListOnly)
    const voterGroupsEnabled = election.settings.voter_groups_enabled === true
    const [enableVoterGroup, setEnableVoterGroup] = useState(voterGroupsEnabled)
    const [busy, setBusy] = useState(false)
    const [progress, setProgress] = useState<{ uploaded: number, total: number } | null>(null)
    const inputRef = useRef(null)
    const confirm = useConfirm();
    const { startCheckout, isPending: checkoutPending } = useCheckout()
    const [uploadPayment, setUploadPayment] = useState<UploadPayment | null>(null)

    useEffect(() => { onUploadingChange?.(busy) }, [busy])

    const allowedColumns = [];
    if(enableVoterID) allowedColumns.push('voter_id')
    if(enableEmail) allowedColumns.push('email')
    if(enableVoterGroup) allowedColumns.push('voter_group')

    const showError = (message: string) => setSnack({
        message,
        severity: "error",
        open: true,
        autoHideDuration: null
    })

    // Returns a map of unknown group name → voter count, comparing against the election's voter_groups list
    const findNewGroups = (rolls: RollInput[]): Map<string, number> => {
        const existingGroups = election.settings.voter_groups ?? []
        const groupMap = new Map(existingGroups.map(g => [g.toLowerCase(), g]))
        const newGroups = new Map<string, number>()
        for (const roll of rolls) {
            const raw = (roll.precinct ?? '').trim()
            if (raw === '') continue
            if (!groupMap.has(raw.toLowerCase())) {
                newGroups.set(raw, (newGroups.get(raw) ?? 0) + 1)
            }
        }
        return newGroups
    }

    // The voter limit is hit either by the pre-upload check below or by the server's 402 Payment Required response
    // (e.g. if the roll grew since we fetched it). With payments on, both open the upload payment dialog, priced for
    // roll + upload; checkout runs before any (more) voters are added. With payments off, explain the limit instead.
    const onPaymentRequired = (message: string, uploadCount: number, alreadyAdded: number, rollCount: number, currentEntitlements: ElectionEntitlements | undefined) => {
        const lineItems = currentEntitlements ? itemize({ roll_count: rollCount }, currentEntitlements) : []
        if (!paymentsEnabled || lineItems.length === 0) {
            showError(message)
            return
        }
        setUploadPayment({ uploadCount, alreadyAdded, rollCount, entitlements: currentEntitlements, lineItems })
    }

    // Shared by the text field and the csv upload
    // 1. fetch the current roll so we can find conflicts (voters that are already on the list, or that repeat within this upload)
    // 2. confirm with the admin (always for csv files, otherwise only when there are conflicts or new groups to handle)
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

            // Drafts have no limit on adding voters: payment happens at Finalize
            const voterLimit = entitlements?.voter_limit;
            const requestedVoterCount = existing.electionRoll.length + uploadCount;
            if (election.state !== 'draft' && election.settings.voter_access == 'closed'
                && voterLimit !== undefined && requestedVoterCount > voterLimit) {
                onPaymentRequired(
                    `This election is limited to ${formatCount(voterLimit)} voters, and this upload would bring it to ${formatCount(requestedVoterCount)}.`,
                    uploadCount, 0, requestedVoterCount, entitlements)
                return
            }

            const newGroups = voterGroupsEnabled ? findNewGroups(conflicts.rolls) : new Map<string, number>()
            const newGroupList = [...newGroups.entries()]
                .map(([name, count]) => `"${name}" (${count} ${count === 1 ? 'voter' : 'voters'})`)
                .join(' and ')
            const skipDetails = [
                conflicts.existingCount > 0 && `${conflicts.existingCount} already on your voter list`,
                conflicts.fileCount > 0 && `${conflicts.fileCount} repeated within your upload`,
            ].filter(Boolean) as string[]

            if (newGroups.size > 0) {
                const isFinalized = election.state !== 'draft'
                if (isFinalized) {
                    showError(
                        `This upload includes voter groups that aren't on your list: ${newGroupList}. Voter groups can't be added after the election is finalized, so nothing was uploaded.`
                    )
                    return
                }

                const existingGroups = election.settings.voter_groups ?? []
                const existingClause = existingGroups.length > 0
                    ? ` to your existing voter groups ${existingGroups.map(g => `"${g}"`).join(', ')}`
                    : ''
                const newGroupWord = newGroups.size === 1 ? 'voter group' : 'voter groups'
                const confirmed = await confirm({
                    title: `Upload ${uploadCount} voters?`,
                    message: [`This adds ${newGroupWord} ${newGroupList}${existingClause}.`, ...skipDetails].join('\n'),
                    submit: `Upload ${uploadCount} voters`,
                    cancel: 'Cancel',
                })
                if (!confirmed) return

                // Add new groups to the election settings before uploading voters
                await updateElection(e => {
                    e.settings.voter_groups = [...(e.settings.voter_groups ?? []), ...newGroups.keys()]
                })
            } else if (skippedCount > 0 || alwaysConfirm) {
                const confirmed = await confirm({
                    title: skippedCount > 0 ? 'Some voters will be skipped' : `Upload ${uploadCount} voters?`,
                    message: skippedCount > 0
                        ? `${skipDetails.join(' and ')} will be skipped because they have a conflicting voter ID or email. Continue uploading the remaining ${uploadCount} voters?`
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

            if (result.aborted && result.errorStatus === 402) {
                const message = result.errorMessage ?? 'This election has reached its voter limit.'
                if (!paymentsEnabled) {
                    showError(message)
                    return
                }
                // Re-price against fresh state: the roll (or the limit) changed since the pre-upload check.
                // Batches before the 402 were added, so only the rest of this upload still needs room.
                const remaining = uploadCount - result.uploaded
                const fresh = await refreshElection()
                const freshRolls = await getRolls.makeRequest()
                if (!fresh || !freshRolls) return // useFetch already reported the error
                onPaymentRequired(message, remaining, result.uploaded, freshRolls.electionRoll.length + remaining, fresh.entitlements)
                return
            }
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

        const expectedCounts = Number(enableVoterID) + Number(enableEmail) + Number(enableVoterGroup)
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
            if (enableVoterGroup) roll.precinct = row[count++].trim()
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
            if (headers.length === 0 || headers.length !== allowedColumns.length || !headers.every((h, i) => h === allowedColumns[i])) {
                showError(`Invalid headers: expected ${allowedColumns.join(', ')}`)
                return
            }
            const rolls: RollInput[] = parsed.data
                .map(row => ({
                    state: 'approved',
                    voter_id: row.voter_id?.trim(),
                    email: row.email?.trim(),
                    precinct: row.voter_group?.trim(),
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
                    {paymentReceived && <PaymentReceivedBanner />}

                    <Typography align='center' component="p">
                        Enter your voter roll data in the field below.<br/>{`(1 ${emailListOnly ? "email" : "voter"} per row, no spaces)`}
                    </Typography>

                    { !paymentsEnabled && election.settings.voter_access == 'closed' && entitlements &&
                        <Typography align='center' component="p">
                        { entitlements.voter_limit !== pricingConfig.FREE_TIER_LIMIT ?
                            `* Your election is approved for ${entitlements.voter_limit} voters`
                        :
                            `* Free tier elections are limited to ${entitlements.voter_limit} voters, email us at elections@equal.vote for an override`
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
                                            id="enable-voter-group"
                                            name="Voter Group"
                                            checked={enableVoterGroup}
                                            disabled={!voterGroupsEnabled}
                                            onChange={(e) => setEnableVoterGroup(e.target.checked)} />
                                    }
                                    label='Voter Group'
                                />
                            }
                        </FormGroup>
                    </Grid>
                    <Grid sx={{ p: 1 }}>
                        <TextField id="email-list" name="email-list" label={`Voter ${emailListOnly ? "Emails" : "Data"}`} required rows={3} placeholder={
                                (enableVoterID || enableEmail || enableVoterGroup ?
                                    //https://stackoverflow.com/questions/5501581/why-does-the-map-method-apparently-not-work-on-arrays-created-via-new-arrayc
                                    new Array(2).fill(undefined).map((_, i) => {
                                        const a = [];
                                        if(enableVoterID) a.push(`voter_id${i+1}`)
                                        if(enableEmail) a.push(`email${i+1}`)
                                        if(enableVoterGroup) a.push(`voter_group${i+1}`)
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
                            Upload a csv file of your voter data. Files must include the following headers: {allowedColumns.join(', ')}
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
                {paymentsEnabled && election.settings.voter_access == 'closed' && <AddVotersPricingNote />}
            </Container >
            <UploadPaymentDialog
                payment={uploadPayment}
                pending={checkoutPending}
                onCancel={() => setUploadPayment(null)}
                onConfirm={payment => startCheckout(payment.lineItems, payment.entitlements)}
            />

        </form >
    )
}

export default AddElectionRoll
