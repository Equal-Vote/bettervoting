export const validElectionStates = ['draft', 'finalized', 'open', 'closed', 'archived'] as const;
export type ElectionState = typeof validElectionStates[number];
