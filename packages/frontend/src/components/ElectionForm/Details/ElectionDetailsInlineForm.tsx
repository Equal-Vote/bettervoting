import { useEffect, useState } from 'react'
import Grid from "@mui/material/Grid";
import { Box, IconButton, Paper, Typography } from "@mui/material"
import ElectionStateChip from './ElectionStateChip';
import { PrimaryButton } from '../../styles';
import useElection from '../../ElectionContextProvider';
import { useSubstitutedTranslation } from '../../util';
import EditIcon from '@mui/icons-material/Edit';
import ElectionDetailsForm from './ElectionDetailsForm';
import { useEditElectionDetails } from './useEditElectionDetails';
import { FormattedDescription } from '../../FormattedDescription';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';

export default function ElectionDetailsInlineForm() {
    const { editedElection, applyUpdate, onSave, errors, setErrors } = useEditElectionDetails()
    const { election } = useElection()

    const {t} = useSubstitutedTranslation(election.settings.term_type, {time_zone: election.settings.time_zone});

    const [open, setOpen] = useState(election.title.length==0);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    // Reset open state when election changes
    useEffect(() => {
        setOpen(election.title.length==0);
    }, [election.election_id]);

    const handleSave = async () => {
        const success = await onSave()
        if (success) handleClose()
    }
    return (
        <Paper elevation={3} sx={{width:'100%'}}>
        <>
            {!open &&
                <Grid container
                    sx={{
                        m: 0,
                        p: 4,
                    }}
                >
                    <Grid item container xs={11}>
                        <Grid item xs={12}>
                            <Typography variant="h3" component="h4">
                                {election.title}
                                <ElectionStateChip state={election.state} />
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            {election.description == '' ? (
                                <Typography gutterBottom component="p" sx={{opacity: .5}}>
                                    {t('admin_home.description_unset')}
                                </Typography>
                            ) : (
                                <FormattedDescription
                                    description={election.description}
                                    gutterBottom
                                />
                            )}
                        </Grid>
                    </Grid>
                    <Grid item xs={1} sx={{ m: 0, p: 1 }}>

                        <Box sx={{}}>
                            <IconButton
                                aria-label="Edit Election Details"
                                disabled={election.state!=='draft'}
                                onClick={handleOpen}>
                                <EditIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>}
            {open && <>
                <ElectionDetailsForm
                    editedElection={editedElection as Election}
                    applyUpdate={applyUpdate}
                    errors={errors}
                    setErrors={setErrors}
                />
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    p: 1
                }}>
                    <Box sx={{ p: 1 }}>
                        <PrimaryButton
                            type='button'
                            variant="contained"
                            // width="100%"
                            fullWidth={false}
                            onClick={handleClose}
                            disabled={election.title.length==0}>
                            {t('keyword.cancel')}
                        </PrimaryButton>
                    </Box>
                    <Box sx={{ p: 1 }}>
                        <PrimaryButton
                            type='button'
                            variant="contained"
                            fullWidth={false}
                            onClick={() => handleSave()}>
                            {t('keyword.save')}
                        </PrimaryButton>
                    </Box>
                </Box>
            </>}
        </>
        </Paper>

    )
}
