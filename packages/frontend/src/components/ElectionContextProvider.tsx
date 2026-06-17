import { ReactNode, useContext, useEffect, useRef, useState } from 'react'
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
    }>;
    // Wrap any admin write so it (1) participates in the in-flight indicator
    // and (2) receives the latest expected_update_date the client has observed
    // (advanced by GET responses and by the previous successful write).
    // Throws if called while another write is already in flight — callsites
    // must batch multi-field changes into a single updateElection.
    enqueueWrite: <T>(fn: (expected_update_date: string) => Promise<T>) => Promise<T>;
    inFlight: boolean;
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
    enqueueWrite: () => Promise.resolve(undefined as never),
    inFlight: false,
    permissions: [],
    t: () => undefined
})

export const ElectionContextProvider = ({ id, localElection=undefined, setLocalElection=undefined, children }: { id: string, localElection?: Election | NewElection, setLocalElection?: (election: Election | NewElection) => void, children: ReactNode}) => {
    const { data, makeRequest: fetchData } = useGetElection(id)
    const { makeRequest: editElection } = useEditElection(id)

    // Latest update_date the client has observed. Advanced by GET responses
    // *and* by successful writes — without the post-write bump, a queued
    // write would branch from a stale version and 409.
    const latestUpdateDate = useRef<string | undefined>(undefined);

    // Invariant: at most one admin write in flight at a time. The gate flips
    // `inert` immediately when this turns true, so the user can't initiate a
    // second one. Callsites must batch multi-field changes into a single
    // updateElection — see the throw in enqueueWrite below.
    const inFlightRef = useRef(false);
    const [inFlight, setInFlight] = useState(false);

    useEffect(() => {
        if(id != undefined) fetchData()
    }, [id])

    useEffect(() => {
        if (data?.election?.update_date) {
            latestUpdateDate.current = data.election.update_date as string;
        }
    }, [data?.election?.update_date]);

    const enqueueWrite = async <T,>(fn: (expected_update_date: string) => Promise<T>): Promise<T> => {
        if (inFlightRef.current) {
            // The gate's `inert` blocks user clicks, so this can only happen if
            // a single handler dispatches multiple admin writes. Combine them
            // into one updateElection that mutates all the fields at once.
            throw new Error('concurrent admin write — batch field changes into one updateElection');
        }
        inFlightRef.current = true;
        setInFlight(true);
        try {
            const expected_update_date = latestUpdateDate.current as string;
            const result = await fn(expected_update_date);
            // Advance the tracked version from the response so a follow-up
            // write (after this one resolves) doesn't 409.
            const updated = (result as unknown as { election?: { update_date?: string } })?.election?.update_date;
            if (typeof updated === 'string' && updated.length > 0) {
                latestUpdateDate.current = updated;
                if (data?.election) {
                    (data.election as IElection).update_date = updated;
                }
            }
            return result;
        } finally {
            inFlightRef.current = false;
            setInFlight(false);
        }
    };

    const applyElectionUpdate = async (updateFunc: (election: IElection) => void) => {
        if(id === undefined && localElection !== undefined){
            const electionCopy: IElection = structuredClone(localElection)
            updateFunc(electionCopy);
            setLocalElection(electionCopy)
            return
        }
        if (!data?.election) return false

        return enqueueWrite(async (expected_update_date) => {
            updateFunc(data.election as IElection)
            const result = await editElection({ Election: data.election as IElection, expected_update_date })
            if (result === false) {
                fetchData();
                return false;
            }
            return result;
        });
    };

    // This should use local timezone by default, consumers will have to call it directly if they want it to use the election timezone
    const {t} = useSubstitutedTranslation(localElection === undefined ? (data?.election?.settings?.term_type ?? 'election') : localElection.settings.term_type);

    return (<ElectionContext.Provider
        value={{
            election: id == undefined ? localElection : data?.election,
            precinctFilteredElection: data?.precinctFilteredElection,
            voterAuth: data?.voterAuth,
            refreshElection: fetchData,
            updateElection: applyElectionUpdate,
            enqueueWrite,
            inFlight,
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
