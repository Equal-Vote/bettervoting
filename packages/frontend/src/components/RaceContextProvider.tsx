import { useContext } from 'react'
import { createContext } from 'react'
import { Race } from '@equal-vote/star-vote-shared/domain_model/Race';
import { ElectionResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';


export interface IRaceContext {
  race: Race,
  results: ElectionResults,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key?: string, v?: object) => any
}

export const RaceContext = createContext<IRaceContext>({
  race: null,
  results: null,
  t: () => {},
})

interface RaceContextProviderProps {
  race: Race,
  results: ElectionResults,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key?: string, v?: object) => any,
  children: React.ReactNode
}

export const RaceContextProvider = ({ race, results, t, children }: RaceContextProviderProps) => {
    return (<RaceContext.Provider value={{race, results, t}}>
        {children}
    </RaceContext.Provider>
    )
}

export default function useRace() {
    return useContext(RaceContext);
}
