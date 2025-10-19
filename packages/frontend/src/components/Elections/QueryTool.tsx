import { useEffect, useMemo, useState } from 'react'
import { useGetElections, useQueryElections } from "../../hooks/useAPI";
import { useNavigate } from 'react-router';
import EnhancedTable from '../EnhancedTable';
import {  Box, Button, Container, Input, Link, Typography } from '@mui/material';
import { DateTime } from 'luxon';
import { dateToLocalLuxonDate } from '../ElectionForm/Details/useEditElectionDetails';

export default () => {
    const navigate = useNavigate();

    const { data, isPending, makeRequest: fetchElections } = useQueryElections();


    const timeZone = DateTime.now().zone.name;
    const [startTime, setStartTime] = useState(DateTime.now().minus({days: 30}).setZone(timeZone, { keepLocalTime: true }).toJSDate())
    const [endTime, setEndTime] = useState(DateTime.now().setZone(timeZone, { keepLocalTime: true }).toJSDate())

    useEffect(() => {fetchElections({start_time: startTime, end_time: endTime})}, []);

    const openElectionsData = useMemo(
        () => {
            console.log(data)
            return data?.open_elections ? [...data.open_elections] : []
        },
        [data]
    );

    const voteCounts = useMemo(
        () => data?.vote_counts ? Object.fromEntries(data.vote_counts.map(e => [e.election_id, e.v])) : {},
        [data]
    );



    return <Container>
        <Typography variant="h4">
            Search elections created within the time range.
        </Typography>

        <Box sx={{margin: 3, display: 'flex', gap: 2, flexDirection: 'row'}}>
            <Typography> Created between </Typography>
            <Input
                type='datetime-local'
                inputProps={{ "aria-label": "Start Time" }}
                value={dateToLocalLuxonDate(startTime, timeZone)}
                onChange={(e) => {
                    const dt = DateTime.fromISO(e.target.value).setZone(timeZone, { keepLocalTime: true }).toJSDate();
                    setStartTime(dt)
                }}
            />
            <Typography> and </Typography>
            <Input
                type='datetime-local'
                inputProps={{ "aria-label": "Start Time" }}
                value={dateToLocalLuxonDate(endTime, timeZone)}
                onChange={(e) => {
                    const dt = DateTime.fromISO(e.target.value).setZone(timeZone, { keepLocalTime: true }).toJSDate();
                    setEndTime(dt)
                }}
            />

            <Button variant='outlined' onClick={() => fetchElections({start_time: startTime, end_time: endTime})}>Search</Button>
        </Box>


        <EnhancedTable
            title='Elections'
            headKeys={[ 'title', 'create_date', 'votes', 'election_state', 'owner_id']}
            data={openElectionsData}
            voteCounts={voteCounts}
            isPending={isPending}
            pendingMessage='Loading Elections...'
            handleOnClick={(election) => navigate(`/${String(election.raw.election_id)}`)}
            defaultSortBy='create_date'
            emptyContent='No elections'
        />
    </Container>
}