import { ReactNode, useContext, useEffect, useState } from 'react'
import { createContext } from 'react'
import { Election, NewElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import { useEditElection, useGetElection } from '../hooks/useAPI';
import { Election as IElection } from '@equal-vote/star-vote-shared/domain_model/Election';
import { VoterAuth } from '@equal-vote/star-vote-shared/domain_model/VoterAuth';
import structuredClone from '@ungap/structured-clone';
import { useSubstitutedTranslation } from './util';


export interface IElectionContext {
    election: Election | NewElection;
    precinctFilteredElection: Election;
    voterAuth: VoterAuth;
    refreshElection: (data?: undefined) => Promise<false | {
        election: Election;
        precinctFilteredElection: Election;
        voterAuth: VoterAuth;
    }>;
    updateElection: (updateFunc: (election: IElection) => void) => Promise<false | {
        election: Election;
    } | undefined>;
    isSaving: boolean;
    trackSave: <T>(promise: Promise<T>) => Promise<T>;
    permissions: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key?: string, v?: object) => any;
}


export const ElectionContext = createContext<IElectionContext>({
    election: null,
    precinctFilteredElection: null,
    voterAuth: null,
    refreshElection: () => Promise.resolve(false),
    updateElection: () => Promise.resolve(false),
    isSaving: false,
    trackSave: (p) => p,
    permissions: [],
    t: () => undefined
})

export const ElectionContextProvider = ({ id, localElection=undefined, setLocalElection=undefined, children }: { id: string, localElection?: Election | NewElection, setLocalElection?: (election: Election | NewElection) => void, children: ReactNode}) => {
    const { data, makeRequest: fetchData } = useGetElection(id)
    const { makeRequest: editElection } = useEditElection(id)

    const [internalElection, setInternalElection] = useState<Election | NewElection | null>(null);
    const [savingCount, setSavingCount] = useState(0);
    const isSaving = savingCount > 0;

    useEffect(() => {
        if(id != undefined) fetchData()
    }, [id])

    // Sync internal state with the fetched election whenever the server pushes a new value.
    useEffect(() => {
        if (id === undefined) return;
        if (data?.election) setInternalElection(data.election);
    }, [data?.election, id])

    // In local-only mode (new election form before save), mirror the parent-controlled localElection.
    useEffect(() => {
        if (id !== undefined) return;
        if (localElection !== undefined) setInternalElection(localElection);
    }, [localElection, id])

    const trackSave = async <T,>(promise: Promise<T>): Promise<T> => {
        setSavingCount(c => c + 1);
        try {
            return await promise;
        } finally {
            setSavingCount(c => c - 1);
        }
    };

    const applyElectionUpdate = async (updateFunc: (election: IElection) => void) => {
        if(id === undefined && localElection !== undefined){
            const electionCopy: IElection = structuredClone(localElection)
            updateFunc(electionCopy);
            setLocalElection(electionCopy)
            setInternalElection(electionCopy)
            return
        }
        if (!internalElection) return
        const optimistic: IElection = structuredClone(internalElection)
        updateFunc(optimistic);
        setInternalElection(optimistic)
        const result = await trackSave(editElection({ Election: optimistic }))
        if (result === false) {
            // Server rejected (validation, 409 stale-write, network). Refetch to re-sync.
            await fetchData();
            return false;
        }
        setInternalElection(result.election);
        return result;
    };

    // This should use local timezone by default, consumers will have to call it directly if they want it to use the election timezone
    const {t} = useSubstitutedTranslation(localElection === undefined ? (data?.election?.settings?.term_type ?? 'election') : localElection.settings.term_type);

    return (<ElectionContext.Provider
        value={{
            election: id == undefined ? localElection : internalElection,
            precinctFilteredElection: data?.precinctFilteredElection,
            voterAuth: data?.voterAuth,
            refreshElection: fetchData,
            updateElection: applyElectionUpdate,
            isSaving,
            trackSave,
            permissions: data?.voterAuth?.permissions,
            t,
        }}>
        {(data || id == undefined) && children}
    </ElectionContext.Provider>
    )
}

export default function useElection() {
    return useContext(ElectionContext);
}
