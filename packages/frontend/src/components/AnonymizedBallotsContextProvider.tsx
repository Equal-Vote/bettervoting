import { useContext } from 'react';
import { createContext } from 'react';
import { useGetAnonymizedBallots } from '../hooks/useAPI';
import { AnonymizedBallot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { Score } from '@equal-vote/star-vote-shared/domain_model/Score';
import useRace from './RaceContextProvider';
import { Vote } from '@equal-vote/star-vote-shared/domain_model/Vote';

export interface IAnonymizedBallotsContext {
    ballots: AnonymizedBallot[] | null,
    fetchBallots: () => void,
    ballotsForRace: () => Score[][],
    ballotsForRaceWithMeta: () => Vote[],
}

export const AnonymizedBallotsContext = createContext<IAnonymizedBallotsContext >({
    ballots: null,
    fetchBallots: () => {},
    ballotsForRace: () => [],
    ballotsForRaceWithMeta: () => []
})

interface AnonymizedBallotsContextProviderProps {
    id: string,
    children: React.ReactNode
}

export const AnonymizedBallotsContextProvider = ({ id, children }: AnonymizedBallotsContextProviderProps) => {
    const { data, isPending, makeRequest: fetchData } = useGetAnonymizedBallots(id)

    return (<AnonymizedBallotsContext.Provider
        value={{
            ballots: data?.ballots ?? null,
            fetchBallots: async () => {
                if(!data && !isPending) fetchData()
            },
            ballotsForRace: () => {
                const {race} = useRace();
                return data?.ballots
                    .map(b =>
                        b.votes
                        .filter(v => v.race_id == race.race_id)
                        .filter(v => v.overvote_rank > 0 || v.scores.some(s => s.score != null && s.score != undefined))
                        .map(v => v.scores)
                    )
                    .flat() ?? []
            },
            ballotsForRaceWithMeta: () => {
                const {race} = useRace();
                return data?.ballots
                    .map(b =>
                        b.votes
                        .filter(v => v.race_id == race.race_id)
                        .filter(v => v.overvote_rank > 0 || v.scores.some(s => s.score != null && s.score != undefined))
                    )
                    .flat() ?? []
            }
        }}>
        {children}
    </AnonymizedBallotsContext.Provider>
    )
}

export default function useAnonymizedBallots() {
    return useContext(AnonymizedBallotsContext);
}
