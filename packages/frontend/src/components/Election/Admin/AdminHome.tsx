import Grid from "@mui/material/Grid";
import { Box, Divider } from "@mui/material";
import { Typography } from "@mui/material";
import { PrimaryButton } from "../../styles";
import { Link, useNavigate } from 'react-router-dom';
import { usePostElection } from "../../../hooks/useAPI";
import { useSubstitutedTranslation } from '../../util';
import useConfirm from '../../ConfirmationDialogProvider';
import useElection from '../../ElectionContextProvider';
import ElectionDetailsInlineForm from '../../ElectionForm/Details/ElectionDetailsInlineForm';
import structuredClone from '@ungap/structured-clone';
import useAuthSession from '../../AuthSessionContextProvider';
import useFeatureFlags from '../../FeatureFlagContextProvider';

type SectionProps = {
    text: {[key: string]: string}
    button: JSX.Element
    permission?: string
    includeDivider?: boolean
}

const AdminHome = () => {
    const authSession = useAuthSession()
    const { election, permissions } = useElection()
    const {t} = useSubstitutedTranslation(election.settings.term_type, {time_zone: election.settings.time_zone});

    const navigate = useNavigate()
    const { makeRequest: postElection } = usePostElection()
    
    const confirm = useConfirm()

    const hasPermission = (requiredPermission: string) => {
        return (permissions && permissions.includes(requiredPermission))
    }

    if (!hasPermission('canEditElectionState')) return <Box width='100%'>
        <Typography align='center' variant="h5" sx={{ color: 'error.main', pl: 2 }}>
            {t('admin_home.admin_access_denied')}
        </Typography>
    </Box>

    const duplicateElection = async () => {
        const confirmed = await confirm(t('admin_home.duplicate_confirm'))
        if (!confirmed) return
        const copiedElection = structuredClone(election)
        copiedElection.title = t('admin_home.copied_title', {title: copiedElection.title})
        copiedElection.frontend_url = ''
        copiedElection.owner_id = authSession.getIdField('sub')
        copiedElection.state = 'draft'

        const newElection = await postElection(
            {
                Election: copiedElection,
            })

        if ((!newElection)) {
            throw Error("Error submitting election");
        }
        navigate(`/${newElection.election.election_id}/admin`)
    }

    const Section = ({ text, button, permission, includeDivider=true }: SectionProps) => 
        <Grid container sx={{ maxWidth: 800}}>
            <Grid item xs={12} md={8} sx={{ p: 1 }}>
                <Box sx={{ minHeight: { xs: 0, md: 60 } }}>
                    <Typography variant="h5">
                        {text.description}
                    </Typography>
                    {text.subtext && 
                        <Typography variant="body1" sx={{ pl: 2 }}>
                            {text.subtext}
                        </Typography>
                    }
                    {permission && !hasPermission(permission) &&
                        <Typography align='center' variant="body1" sx={{ color: 'error.main', pl: 2 }}>
                            {t('admin_home.permissions_error')}
                        </Typography>
                    }
                </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ p: 1, pl: 2, display: 'flex', alignItems: 'center' }}>
                {button}
            </Grid>
            {includeDivider && <Divider style={{width: '100%'}}/>}
        </Grid>

    const EditRolesSection = () => <Section
        text={t('admin_home.roles')}
        permission='canEditElectionRoles'
        button={(<>
            <PrimaryButton
                disabled={!hasPermission('canEditElectionRoles')}
                fullWidth
                component={Link} to={`/${election.election_id}/admin/roles`}
            >
                {t('admin_home.roles.button')}
            </PrimaryButton>
        </>)}
    />

    const DuplicateElectionSection = () => <Section
        text={t('admin_home.duplicate')}
        button={
            <PrimaryButton
                disabled={!hasPermission('canEditElectionState')}
                fullWidth
                onClick={() => duplicateElection()}
            >
                {t('admin_home.duplicate.button')}
            </PrimaryButton>
        }
    />

    const getTimingMessage = () => {
        if(election.state === 'finalized' && election.start_time)
            return t('admin_home.header_start_time', {datetime: election.start_time})
        if(election.state === 'open' && election.end_time)
            return t('admin_home.header_end_time', {datetime: election.end_time})
        if(election.state === 'closed' && election.end_time)
            return t('admin_home.header_ended_time', {datetime: election.end_time})
        if(election.state === 'archived' && election.end_time)
            return t('admin_home.header_ended_time', {datetime: election.end_time})
        return undefined;
    }

    const flags = useFeatureFlags();

    return <>
        {getTimingMessage() && <Box width={'100%'}><Typography align='center' gutterBottom variant="h6" component="h6"> {getTimingMessage()}</Typography></Box>}
        <ElectionDetailsInlineForm />
        <Box sx={{width: '100%'}}>
            {flags.isSet('ELECTION_ROLES') && <EditRolesSection />}
            <DuplicateElectionSection/>
        </Box>
    </>
}

export default AdminHome
