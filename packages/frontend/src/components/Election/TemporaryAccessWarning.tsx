import { useCookie } from "~/hooks/useCookie";
import { useMemo } from 'react';
import useAuthSession from "../AuthSessionContextProvider";
import { PrimaryButton } from "../styles";
import ElectionStateWarning from "./ElectionStateWarning"
import useElection from "../ElectionContextProvider";
import { sharedConfig } from "@equal-vote/star-vote-shared/config";
import { makeID, ID_PREFIXES, ID_LENGTHS } from '@equal-vote/star-vote-shared/utils/makeID';

export default () => {
    const authSession = useAuthSession();
    const defaultTempId = useMemo(() => makeID(ID_PREFIXES.VOTER, ID_LENGTHS.VOTER), []);
    const [tempID] = useCookie('temp_id', defaultTempId);
    const {election, t} = useElection();

    const hoursSinceCreate = (new Date().getTime() - new Date(election.create_date).getTime()) / (1000 * 60 * 60)
    const [claimKey, setClaimKey] = useCookie(`${election.election_id}_claim_key`, '')

    if(election.owner_id != tempID || hoursSinceCreate > sharedConfig.TEMPORARY_ACCESS_HOURS || !claimKey) return <></>

    return (
        <ElectionStateWarning
            title="temporary_access_warning.title"
            description="temporary_access_warning.description"
            hideIcon
        >
            <PrimaryButton onClick={async () => {
                sessionStorage.setItem('election_to_claim', election.election_id)
                authSession.openLogin()
            }} sx={{width: 242, m: 'auto'}}>{t('nav.sign_in')}</PrimaryButton>
        </ElectionStateWarning>
    );
}