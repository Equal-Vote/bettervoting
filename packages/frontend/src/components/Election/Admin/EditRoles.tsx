import { useState } from "react"
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import PermissionHandler from "../../PermissionHandler";
import { usePutElectionRoles } from "../../../hooks/useAPI";
import { PrimaryButton } from "../../styles";
import useElection from "../../ElectionContextProvider";


const EditRoles = () => {
    const { election, refreshElection, permissions } = useElection()

    const [adminList, setAdminList] = useState(() => {
        if (election.admin_ids === null) return ''
        return election.admin_ids.join('\n')
    })

    const [auditorList, setAuditorList] = useState(() => {
        if (election.audit_ids === null) return ''
        return election.audit_ids.join('\n')
    })

    const [credentialList, setCredentialList] = useState(() => {
        if (election.credential_ids === null) return ''
        return election.credential_ids.join('\n')
    })

    const putRoles = usePutElectionRoles(election.election_id)

    const onSubmit = async (e) => {
        e.preventDefault()
        try {
            const admin_ids = adminList == '' ? null : adminList.split('\n')
            const audit_ids = auditorList == '' ? null : auditorList.split('\n')
            const credential_ids = credentialList == '' ? null : credentialList.split('\n')

            const newRoles = await putRoles.makeRequest({ admin_ids, audit_ids, credential_ids })
            if (newRoles) {
                refreshElection()
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <form onSubmit={onSubmit}>
            <Container maxWidth='sm'>
                <Grid container direction="column" >
                    <Grid item sx={{ p: 2 }}>
                        <TextField
                            id="admin-list"
                            label="Admin List"
                            InputLabelProps={{
                                shrink: true
                            }}
                            multiline
                            minRows={3}
                            fullWidth
                            type="text"
                            value={adminList}
                            onChange={(e) => setAdminList(e.target.value)}
                            helperText="Emails of election admins, one email per line"
                            placeholder={"admin1@email.com\nadmin2@email.com\nadmin3@email.com"}
                        />
                    </Grid>
                    <Grid item sx={{ p: 2 }}>
                        <TextField
                            id="auditor-list"
                            label="Auditor List"
                            InputLabelProps={{
                                shrink: true
                            }}
                            multiline
                            minRows={3}
                            fullWidth
                            type="text"
                            value={auditorList}
                            onChange={(e) => setAuditorList(e.target.value)}
                            helperText="Emails of election auditors, one email per line"
                            placeholder={"auditor1@email.com\nauditor2@email.com\nauditor3@email.com"}
                        />
                    </Grid>
                    <Grid item sx={{ p: 2 }}>
                        <TextField
                            id="credentialer-list"
                            name="credentialer-list"
                            label="Credentialer List"
                            InputLabelProps={{
                                shrink: true
                            }}
                            multiline
                            minRows={3}
                            fullWidth
                            type="text"
                            value={credentialList}
                            onChange={(e) => setCredentialList(e.target.value)}
                            helperText="Emails of election credentialers, one email per line"
                            placeholder={"credentialer1@email.com\ncredentialer2@email.com\ncredentialer3@email.com"}
                        />
                    </Grid>

                    <Grid item sx={{ p: 2 }}>
                        <PermissionHandler permissions={permissions} requiredPermission={'canEditElectionRoles'}>
                            <PrimaryButton
                                type='submit'
                                disabled={putRoles.isPending}>
                                <Typography align='center' variant="body2" fontWeight={'bold'}>
                                    Submit
                                </Typography>
                            </PrimaryButton>
                        </PermissionHandler>
                    </Grid>
                </Grid>
            </Container>
        </form>
    )
}

export default EditRoles