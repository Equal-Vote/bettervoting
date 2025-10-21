import { useRef, useState, useCallback, useEffect } from 'react'
import { Candidate } from "@equal-vote/star-vote-shared/domain_model/Candidate"
import React from 'react'
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from '@mui/material/Typography';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper } from '@mui/material';
import Cropper from 'react-easy-crop';
import getCroppedImg from './PhotoCropper';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { PrimaryButton, SecondaryButton } from '../../styles';
import useFeatureFlags from '../../FeatureFlagContextProvider';
import { DragHandle } from '~/components/DragAndDrop';
import LinkIcon from '@mui/icons-material/Link';

interface CandidateDialogProps {
    onEditCandidate: (newCandidate: Candidate) => void,
    candidate: Candidate,
    onSave: () => void,
    open: boolean,
    handleClose: () => void
}

const CandidateDialog = ({ onEditCandidate, candidate, onSave, open, handleClose }: CandidateDialogProps) => {
    const flags = useFeatureFlags();

    const onApplyEditCandidate = (updateFunc) => {
        const newCandidate = { ...candidate }
        updateFunc(newCandidate)
        onEditCandidate(newCandidate)
    }

    const [candidatePhotoFile, setCandidatePhotoFile] = useState(null)
    const inputRef = useRef(null)

    const handleDragOver = (e) => {
        e.preventDefault()
    }
    const handleOnDrop = (e) => {
        e.preventDefault()
        setCandidatePhotoFile(URL.createObjectURL(e.dataTransfer.files[0]))
    }

    const [zoom, setZoom] = useState(1)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const onCropChange = (crop) => { setCrop(crop) }
    const onZoomChange = (zoom) => { setZoom(zoom) }
    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const postImage = async (image) => {
        const url = '/API/images'

        const fileOfBlob = new File([image], 'image.jpg', { type: "image/jpeg" });
        const formData = new FormData()
        formData.append('file', fileOfBlob)
        const options = {
            method: 'post',
            body: formData
        }
        const response = await fetch(url, options)
        if (!response.ok) {
            return false
        }
        const data = await response.json()
        onApplyEditCandidate((candidate) => { candidate.photo_filename = data.photo_filename })
        return true
    }

    const saveImage = async () => {
        const image = await getCroppedImg(
            candidatePhotoFile,
            croppedAreaPixels
        )
        if (await postImage(image)) {
            setCandidatePhotoFile(null)
        }
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            scroll={'paper'}
            keepMounted>
            <DialogTitle> Edit Candidate </DialogTitle>
            <DialogContent>
                <Grid container>

                    <Grid item xs={12} sx={{ display: "flex", alignItems: "center", m: 0, p: 1 }}>
                        <TextField
                            id={'candidate-name'}
                            inputProps={{ "aria-label": "New Candidate Name" }}
                            label={"Candidate Name"}
                            type="text"
                            value={candidate.candidate_name}
                            fullWidth

                            sx={{
                                px: 0,
                                boxShadow: 2,
                            }}
                            onChange={(e) => onApplyEditCandidate((candidate) => { candidate.candidate_name = e.target.value })}
                        />
                    </Grid>
                    {flags.isSet('CANDIDATE_DETAILS') && <>
                        <Grid item xs={12} sx={{ position: 'relative', display: 'flex', flexDirection: { sm: 'row', xs: 'column' }, justifyContent: 'flex-start', alignItems: 'top' }}>
                            {flags.isSet('CANDIDATE_PHOTOS') && <>
                                <Box>
                                    {!candidatePhotoFile &&
                                        <>
                                            <Grid item
                                                className={candidate.photo_filename ? 'filledPhotoContainer' : 'emptyPhotoContainer'}
                                                sx={{ display: "flex", flexDirection: "column", alignItems: "center", m: 0, p: 1, gap: 1 }}
                                            >
                                                {/* NOTE: setting width in px is a bad habit, but I change the flex direction to column on smaller screens to account for this */}
                                                <Box
                                                    display={'flex'}
                                                    flexDirection={'column'}
                                                    justifyContent={'center'}
                                                    alignItems={'center'}
                                                    height={'200px'}
                                                    minWidth={'200px'}
                                                    border={'4px dashed rgb(112,112,112)'}
                                                    sx={{ m: 0 }}
                                                    style={{ margin: '0 auto 0 auto' }}
                                                    onDragOver={handleDragOver}
                                                    onDrop={handleOnDrop}
                                                >
                                                    {candidate.photo_filename &&
                                                        <img aria-labelledby='candidate-photo-caption' src={candidate.photo_filename} style={{ position: 'absolute', width: 200, height: 200 }} />
                                                    }
                                                    <Typography id='candidate-photo-caption' variant="h6" component="h6" style={{ marginTop: 0 }}>
                                                        Candidate Photo
                                                    </Typography>
                                                    <Typography variant="h6" component="h6" sx={{ m: 0 }} style={candidate.photo_filename ? { marginTop: '50px' } : {}} >
                                                        Drag and Drop
                                                    </Typography>
                                                    <Typography variant="h6" component="h6" sx={{ m: 0 }} >
                                                        Or
                                                    </Typography>
                                                    <input
                                                        type='file'
                                                        onChange={(e) => setCandidatePhotoFile(URL.createObjectURL(e.target.files[0]))}
                                                        hidden
                                                        ref={inputRef} />
                                                    {!candidate.photo_filename &&
                                                        <SecondaryButton 
                                                            className='selectPhotoButton'
                                                            onClick={() => inputRef.current.click()} >
                                                            Select File
                                                        </SecondaryButton>
                                                    }
                                                </Box>
                                                {candidate.photo_filename &&
                                                    <SecondaryButton 
                                                        className='selectPhotoButton'
                                                        onClick={() => inputRef.current.click()}
                                                        sx={{ p: 1, margin: '0 auto 0 auto', width: '150px' }}
                                                    >
                                                        Select File
                                                    </SecondaryButton>
                                                }

                                            </Grid>
                                        </>
                                    }
                                    {candidatePhotoFile &&
                                        <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                                            <Box
                                                position='relative'
                                                width={'100%'}
                                                height={'300px'}
                                            >
                                                <Cropper
                                                    image={candidatePhotoFile}
                                                    zoom={zoom}
                                                    crop={crop}
                                                    onCropChange={onCropChange}
                                                    onZoomChange={onZoomChange}
                                                    onCropComplete={onCropComplete}
                                                    aspect={1}
                                                />
                                            </Box>
                                            <SecondaryButton 
                                                onClick={() => setCandidatePhotoFile(null)} >
                                                Cancel
                                            </SecondaryButton>
                                            <PrimaryButton
                                                onClick={() => saveImage()} >
                                                Save
                                            </PrimaryButton>
                                        </Grid>}
                                </Box>
                            </>}
                            <Box flexGrow='1' pl={{ sm: 1, xs: 3 }}>
                                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                                    <TextField
                                        id="long-name"
                                        label="Full Name"
                                        type="text"
                                        fullWidth
                                        value={candidate.full_name}
                                        sx={{
                                            m: 0,
                                            p: 0,
                                            boxShadow: 2,
                                        }}
                                        onChange={(e) => onApplyEditCandidate((candidate) => { candidate.full_name = e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                                    <TextField
                                        id="bio"
                                        label="Bio"
                                        type="text"
                                        rows={3}
                                        multiline
                                        fullWidth
                                        value={candidate.bio}
                                        sx={{
                                            m: 0,
                                            p: 0,
                                            boxShadow: 2,
                                        }}
                                        onChange={(e) => onApplyEditCandidate((candidate) => { candidate.bio = e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                                    <TextField
                                        id="candidate url"
                                        label="Candidate URL"
                                        type="url"
                                        fullWidth
                                        value={candidate.candidate_url}
                                        sx={{
                                            m: 0,
                                            p: 0,
                                            boxShadow: 2,
                                        }}
                                        onChange={(e) => onApplyEditCandidate((candidate) => { candidate.candidate_url = e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                                    <TextField
                                        id="Party"
                                        label="Party"
                                        type="text"
                                        fullWidth
                                        value={candidate.party}
                                        sx={{
                                            m: 0,
                                            p: 0,
                                            boxShadow: 2,
                                        }}
                                        onChange={(e) => onApplyEditCandidate((candidate) => { candidate.party = e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                                    <TextField
                                        id="party url"
                                        label="Party URL"
                                        type="url"
                                        fullWidth
                                        value={candidate.partyUrl}
                                        sx={{
                                            m: 0,
                                            p: 0,
                                            boxShadow: 2,
                                        }}
                                        onChange={(e) => onApplyEditCandidate((candidate) => { candidate.partyUrl = e.target.value })}
                                    />
                                </Grid>
                            </Box>
                        </Grid>
                    </>}

                </Grid>

            </DialogContent>

            <DialogActions>
                <SecondaryButton
                    type='button'
                    onClick={() => onSave()}>
                    Apply
                </SecondaryButton>
            </DialogActions>
        </Dialog>
    )
}
interface CandidateFormProps {
    onEditCandidate: (newCandidate: Candidate) => void,
    candidate: Candidate,
    index: number,
    onDeleteCandidate: () => void,
    disabled: boolean,
    inputRef: (el: React.MutableRefObject<HTMLInputElement[]>) => React.MutableRefObject<HTMLInputElement[]>,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void,
    electionState: string
}

const LinkDialog = ({ onEditCandidate, candidate, open, handleClose }) => {
    const onApplyEditCandidate = (updateFunc) => {
        const newCandidate = { ...candidate }
        updateFunc(newCandidate)
        onEditCandidate(newCandidate)
    }

    const [linkInput, setLinkInput] = useState(candidate.candidate_url);
    const [error, setError] = useState('');

    useEffect(() => {
        setLinkInput(candidate.candidate_url)
        setError('')
    }, [candidate])

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            scroll={'paper'}
            keepMounted>
            <DialogTitle> Update Hyperlink </DialogTitle>
            <DialogContent>
                <Box sx={{width: 300, height: 90}}>
                    <TextField
                        id="candidate url"
                        label="Candidate URL"
                        type="url"
                        fullWidth
                        value={linkInput}
                        sx={{
                            m: 1,
                            p: 0,
                            boxShadow: 2,
                        }}
                        onChange={(e) => {
                            setLinkInput(e.target.value)
                            setError('')
                        }}
                    />
                    <Typography sx={{color: 'var(--brand-red)', fontWeight: 'bold', textAlign: 'end'}}>{error}</Typography>
                </Box>
            </DialogContent>

            <DialogActions>
                <SecondaryButton
                    type='button'
                    onClick={() => {
                        onApplyEditCandidate((candidate) => { candidate.candidate_url = '' })
                        handleClose()
                    }}
                >
                    Remove
                </SecondaryButton>
                <PrimaryButton
                    type='button'
                    onClick={() => {
                        const url = URL.parse(linkInput) ?? URL.parse('https://'+linkInput);
                        if(linkInput != '' && url === null){
                            setError('Invalid URL');
                            return;
                        }
                        onApplyEditCandidate((candidate) => {
                            candidate.candidate_url = linkInput == '' ? '' : url.href;
                        })
                        handleClose()
                    }}
                >
                    Apply
                </PrimaryButton>
            </DialogActions>
        </Dialog>
    )
}

export const CandidateForm = ({ onEditCandidate, candidate, index, onDeleteCandidate, disabled, inputRef, onKeyDown, electionState}: CandidateFormProps) => {

    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const flags = useFeatureFlags();
    const onSave = () => { handleClose() }
    const [linkOpen, setLinkOpen] = React.useState(false);

    return (
        <Paper elevation={4} sx={{ width: '100%' }} aria-label={`Candidate ${index + 1} Form`}>
            <Box
                sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'background.paper', borderRadius: 10 }}
                alignItems={'center'}
            >
                <DragHandle style={{marginLeft: 5}} disabled={disabled} ariaLabel={`Drag Candidate Number ${index + 1}`}/>

                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', pl: 2 }}>
                    <TextField
                        id={`candidate-name-${index + 1}`}
                        inputProps={{ "aria-label": `Candidate ${index + 1} Name` }}
                        // data-testid={`candidate-name-${index + 1}`}
                        type="text"
                        value={candidate.candidate_name}
                        fullWidth
                        variant='standard'
                        margin='normal'
                        onChange={(e) => onEditCandidate({ ...candidate, candidate_name: e.target.value })}
                        inputRef={inputRef}
                        onKeyDown={onKeyDown}
                        disabled={electionState !== 'draft'}
                    />
                </Box>                    

                {flags.isSet('CANDIDATE_DETAILS') &&
                    <IconButton
                        aria-label={`Edit Candidate ${index + 1} Details`}
                        onClick={handleOpen}
                        disabled={disabled}>
                        <EditIcon />
                    </IconButton>
                }
                <IconButton
                    aria-label={`Update Link for Candidate Number ${index + 1}`}
                    color={candidate.candidate_url ? 'info' : 'default'}
                    onClick={() => setLinkOpen(true)}
                    disabled={disabled}>
                    < LinkIcon/>
                </IconButton>
                <IconButton
                    aria-label={`Delete Candidate Number ${index + 1}`}
                    color="error"
                    onClick={onDeleteCandidate}
                    disabled={disabled}>
                    <DeleteIcon />
                </IconButton>
            </Box>
            <CandidateDialog onEditCandidate={onEditCandidate} candidate={candidate} onSave={onSave} open={open} handleClose={handleClose} />

            <LinkDialog onEditCandidate={onEditCandidate} candidate={candidate} open={linkOpen} handleClose={() => setLinkOpen(false)} />
        </Paper >
    )
}

const AddCandidate = ({ onAddNewCandidate }: { onAddNewCandidate: (candidateName: string) => void }) => {

    const handleEnter = (e) => {
        saveNewCandidate()
        e.preventDefault();
    }
    const saveNewCandidate = () => {
        if (newCandidateName.length > 0) {
            onAddNewCandidate(newCandidateName)
            setNewCandidateName('')
        }
    }

    const [newCandidateName, setNewCandidateName] = useState('')

    return (

        <Box
            sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 10 }}
            alignItems={'center'}
        >
            <TextField
                id={'candidate-name'}
                label={"Add Candidate"}
                type="text"
                value={newCandidateName}
                fullWidth
                sx={{
                    px: 0,
                    boxShadow: 2,
                }}
                onChange={(e) => setNewCandidateName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleEnter(e)
                    }
                }}
            />
        </Box>
    )
}

export default AddCandidate

