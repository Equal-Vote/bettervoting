import { Dispatch, useState } from "react"
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import { Checkbox, Divider, FormControlLabel, FormGroup, FormHelperText, InputLabel, MenuItem, Select } from "@mui/material"
import { Input } from '@mui/material';
import { DateTime } from 'luxon'
import { timeZones } from './TimeZones'
import { isValidDate, useSubstitutedTranslation } from '../../util';
import { dateToLocalLuxonDate } from './useEditElectionDetails';
import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { TimeZone } from "@equal-vote/star-vote-shared/domain_model/Util";

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

    const timeZone = editedElection.settings.time_zone ? editedElection.settings.time_zone : DateTime.now().zone.name

    let {t} = useSubstitutedTranslation(editedElection.settings.term_type, {time_zone: timeZone});

    const [enableStartEndTime, setEnableStartEndTime] = useState(isValidDate(editedElection.start_time) || isValidDate(editedElection.end_time))
    const [defaultStartTime, setDefaultStartTime] = useState(isValidDate(editedElection.start_time) ? editedElection.start_time : DateTime.now().setZone(timeZone).toJSDate())
    const [defaultEndTime, setDefaultEndTime] = useState(isValidDate(editedElection.end_time) ? editedElection.end_time : DateTime.now().plus({ days: 1 }).setZone(timeZone).toJSDate())

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

            <Grid item xs={12} sx={{ m: 0, p: 1 }}>
                <FormGroup>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={enableStartEndTime}
                                onChange={(e) => {
                                    setEnableStartEndTime(e.target.checked)
                                    if (e.target.checked) {
                                        applyUpdate(election => { 
                                            election.start_time = defaultStartTime;
                                            election.end_time = defaultEndTime;
                                        })
                                    }
                                    else {
                                        applyUpdate(election => { 
                                            election.start_time = undefined;
                                            election.end_time = undefined;
                                        })
                                    }
                                }
                                }
                            />
                        }
                        label={t('election_details.enable_times')} />
                </FormGroup>
            </Grid>

            {enableStartEndTime &&
                <>
                    <Grid item xs={4} sx={{ m: 0, p: 1 }} justifyContent='center'>
                        <FormControl fullWidth>
                            <InputLabel id="time-zone-label">{t('election_details.time_zone')}</InputLabel>
                            <Select
                                labelId="time-zone-label"
                                id="time-zone-select"
                                value={timeZone}
                                label={t('election_details.time_zone')}
                                onChange={(e) => {
                                    applyUpdate(election => { election.settings.time_zone = e.target.value as TimeZone })
                                    const p = useSubstitutedTranslation(editedElection.settings.term_type, {time_zone: e.target.value});
                                    t = p.t;
                                }}
                            >
                                <MenuItem value={DateTime.now().zone.name}>{DateTime.now().zone.name}</MenuItem>
                                <Divider />
                                {timeZones.map(tz =>
                                    <MenuItem key={tz} value={tz}>{t(`time_zones.${tz}`)}</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={8}></Grid>
                    <Grid item xs={6} sx={{ m: 0, p: 1 }} justifyContent='center' >
                        <FormControl fullWidth>
                            <InputLabel shrink>{t('election_details.start_date')}</InputLabel>
                            {/* datetime-local is formatted according to the OS locale, I don't think there's a way to override it*/}
                            <Input
                                type='datetime-local'
                                inputProps={{ "aria-label": "Start Time" }}
                                // data-testid='start-time'
                                error={errors.startTime !== ''}
                                value={dateToLocalLuxonDate(editedElection.start_time, timeZone)}
                                onChange={(e) => {
                                    setErrors({ ...errors, startTime: '' })
                                    if (e.target.value == null || e.target.value == '') {
                                        applyUpdate(election => { election.start_time = undefined })
                                    } else {
                                        const dt = DateTime.fromISO(e.target.value).setZone(timeZone, { keepLocalTime: true }).toJSDate();
                                        applyUpdate(election => { election.start_time = dt})
                                        setDefaultStartTime(dt)
                                    }
                                }}
                            />
                            <FormHelperText error={!!errors.startTime} sx={{ pl: 0, mt: 0 }}>
                                {errors.startTime || (editedElection.start_time && timeZone !== DateTime.now().zone.name &&
                                    `${DateTime.now().zone.name}: ${DateTime.fromJSDate(new Date(editedElection.start_time)).setZone(DateTime.now().zone.name).toLocaleString(DateTime.DATETIME_SHORT)}`
                                )}
                            </FormHelperText>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sx={{ m: 0, p: 1 }} justifyContent='center'>
                        <FormControl fullWidth>
                            <InputLabel shrink>{t('election_details.end_date')}</InputLabel>
                            {/* datetime-local is formatted according to the OS locale, I don't think there's a way to override it*/}
                            <Input
                                type='datetime-local'
                                inputProps={{ "aria-label": "End Time" }}
                                error={errors.endTime !== ''}
                                value={dateToLocalLuxonDate(editedElection.end_time, timeZone)}
                                onChange={(e) => {
                                    setErrors({ ...errors, endTime: '' })
                                    if (e.target.value == null || e.target.value == '') {
                                        applyUpdate(election => { election.end_time = undefined})
                                    } else {
                                        applyUpdate(election => { election.end_time = DateTime.fromISO(e.target.value).setZone(timeZone, { keepLocalTime: true }).toJSDate()})
                                        setDefaultEndTime(DateTime.fromISO(e.target.value).setZone(timeZone, { keepLocalTime: true }).toJSDate())
                                    }
                                }}
                            />
                            <FormHelperText error={!!errors.endTime} sx={{ pl: 0, mt: 0 }}>
                                {errors.endTime || (editedElection.end_time && timeZone !== DateTime.now().zone.name &&
                                    `${DateTime.now().zone.name}: ${DateTime.fromJSDate(new Date(editedElection.end_time)).setZone(DateTime.now().zone.name).toLocaleString(DateTime.DATETIME_SHORT)}`
                                )}
                            </FormHelperText>
                        </FormControl>
                    </Grid>
                </>
            }
        </Grid>
    )
}
