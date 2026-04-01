import { Dispatch } from "react"
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import { FormHelperText } from "@mui/material"
import { useSubstitutedTranslation } from '../../util';
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";

export interface Errors {
    title: string;
    description?: string;
    startTime?: string;
    endTime?: string;
}

interface ElectionTitleFieldProps {
    termType: string,
    value: string,
    onUpdateValue: (value: string) => void,
    errors: Errors,
    setErrors: Dispatch<React.SetStateAction<Errors>>,
    showLabel?: boolean
}

export const ElectionTitleField = ({termType, value, onUpdateValue, errors, setErrors, showLabel=true}: ElectionTitleFieldProps) => {
    const {t} = useSubstitutedTranslation(termType);
    return <>
        <TextField
            inputProps={{ "aria-label": "Title" }}
            error={errors.title !== ''}
            required
            id="election-title"
            // TODO: This bolding method only works for the text fields, if we like it we should figure out a way to add it to other fields as well
            // inputProps={getStyle('title')}
            label={showLabel? t('election_details.title') : ""}
            type="text"
            value={value}
            sx={{
                m: 0,
                p: 0,
                boxShadow: 2,
            }}
            fullWidth
            onChange={(e) => {
                setErrors({ ...errors, title: '' });
                onUpdateValue(e.target.value);
            }}
            
        />
        <FormHelperText error sx={{ pl: 1, pt: 0 }}>
            {errors.title}
        </FormHelperText>
    </>;
}



interface ElectionDetailsFormProps {
    editedElection: Election;
    applyUpdate: (updateFn: (election: Election) => void) => void;
    errors: Errors;
    setErrors: Dispatch<React.SetStateAction<Errors>>;
}

export default function ElectionDetailsForm({editedElection, applyUpdate, errors, setErrors}: ElectionDetailsFormProps) {

    const {t} = useSubstitutedTranslation(editedElection.settings.term_type);

    return (
        <Grid container sx={{p: 4}}>
            <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                <ElectionTitleField
                    termType={editedElection.settings.term_type}
                    value={editedElection.title}
                    onUpdateValue={
                        (value) => applyUpdate(election => { election.title = value })
                    }
                    errors={errors}
                    setErrors={setErrors}
                />
            </Grid>
            <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                <TextField
                    id="election-description"
                    inputProps={{ "aria-label": "Election Description" }}
                    label={t('election_details.description')}
                    multiline
                    fullWidth
                    type="text"
                    error={errors.description !== ''}
                    value={editedElection.description}
                    helperText={errors.description || "Supports **bold** and [link text](url) formatting"}
                    sx={{
                        mx: { xs: 0, },
                        my: { xs: 0 },
                        boxShadow: 2,
                    }}
                    onChange={(e) => {
                        setErrors({ ...errors, description: '' })
                        applyUpdate(election => { election.description = e.target.value })
                    }}
                />
            </Grid>
        </Grid>
    )
}
