import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router";
import React from 'react'
import Container from '@mui/material/Container';
import EditElectionRoll from "./EditElectionRoll";
import AddElectionRoll from "./AddElectionRoll";
import PermissionHandler from "../../PermissionHandler";
import { Typography } from "@mui/material";
import EnhancedTable, { HeadKey }  from "./../../EnhancedTable";
import { useGetRolls, useSendEmails } from "../../../hooks/useAPI";
import useElection from "../../ElectionContextProvider";
import useFeatureFlags from "../../FeatureFlagContextProvider";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import SendEmailDialog from "./SendEmailDialog";
import { SecondaryButton } from "~/components/styles";


const ViewElectionRolls = () => {
    const { election, permissions } = useElection()
    const { data, isPending, makeRequest: fetchRolls } = useGetRolls(election.election_id)
    const sendEmails = useSendEmails(election.election_id)
    useEffect(() => { fetchRolls() }, [])
    const [isEditing, setIsEditing] = useState(false)
    const [addRollPage, setAddRollPage] = useState(false)
    const [editedRoll, setEditedRoll] = useState<ElectionRoll|null>(null)
    const flags = useFeatureFlags();
    const navigate = useNavigate();
    const location = useLocation();
    const [dialogOpen, setDialogOpen] = useState(false);

    const usesVoterIdAuthentication = !!election.settings.voter_authentication?.voter_id;

    const onOpen = (voter) => {
        setIsEditing(true)
        setEditedRoll(voter?.raw ?? null)
        navigate(`${location.pathname}?editing=true`, { replace: false });
    }
    const onClose = () => {
        setIsEditing(false)
        setAddRollPage(false)
        setEditedRoll(null)
        fetchRolls()
        navigate(location.pathname, { replace: false });
    }
    useEffect(() => {
        if (!location.search.includes('editing=true') && isEditing) {
            onClose();
        }
    }, [location.search])

    const onSendEmails = ({
        subject,
        body,
        target,
    } : {
        subject: string,
        body: string,
        target: 'all' | 'has_voted' | 'has_not_voted' | 'single'
    }) => {
        setDialogOpen(false);
        sendEmails.makeRequest({
            target: target,
            email: { subject, body },
        })
    }

    const onUpdate = async () => {
        const results = await fetchRolls()
        if (!results) return
        setEditedRoll(currentRoll => {
            if (!currentRoll) return null;
            // When voter IDs are redacted (email list elections), always match by email
            const voterIdsAreRedacted = election.settings.invitation === 'email';
            const useEmail = voterIdsAreRedacted || !usesVoterIdAuthentication;
            const identifier = useEmail ? currentRoll.email : currentRoll.voter_id;
            if (!identifier) return null;
            return results.electionRoll.find(roll =>
                useEmail ? roll.email === identifier : roll.voter_id === identifier
            ) ?? null;
        })
    }

    const headKeys:HeadKey[] = (election.settings.invitation === 'email')?
        ['email', /*'invite_status', */'has_voted']
    :
        ['email', 'has_voted'];

    if (flags.isSet('PRECINCTS')) headKeys.push('precinct');

    // HACK to detect if they used email
    if(data && data.electionRoll && data.electionRoll.length > 0 && !data.electionRoll[0].email) headKeys.unshift('voter_id')

    const electionRollData = React.useMemo(
        () => data?.electionRoll ? [...data.electionRoll] : [],
        [data]
    );

    return (
        <Container>
            <Typography align='center' gutterBottom variant="h4" component="h4">
                {election.title}
            </Typography>
            {!isEditing && !addRollPage &&
                <>
                    {election.settings.voter_access === 'closed' &&
                        <PermissionHandler permissions={permissions} requiredPermission={'canAddToElectionRoll'}>
                            <SecondaryButton onClick={() => setAddRollPage(true)} > Add Voters </SecondaryButton>
                        </PermissionHandler>
                    }
                    {election.settings.invitation === 'email' &&
                        <SecondaryButton onClick={() => setDialogOpen(true)} sx={{ml: 2}}>Draft Email Blast </SecondaryButton>
                    }
                    <EnhancedTable
                        headKeys={headKeys}
                        data={electionRollData}
                        isPending={isPending && data?.electionRoll !== undefined}
                        pendingMessage='Loading Voters...'
                        defaultSortBy={headKeys[0]}
                        title="Voters"
                        handleOnClick={(voter) => onOpen(voter)}
                        emptyContent={<p>This election doesn&apos;t have any voters yet</p>}
                    />
                </>
            }
            {
                isEditing && editedRoll &&
                <EditElectionRoll roll={editedRoll} onClose={onClose} fetchRolls={onUpdate}/>
            }
            {
                addRollPage &&
                <AddElectionRoll onClose={onClose} />
            }
            <SendEmailDialog electionRoll={data?.electionRoll} open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={onSendEmails}/>
        </Container >
    )
}

export default ViewElectionRolls
