/* Front-end interfaces for IRV */
export interface irvContext {
  candidatesByIndex: {name: string}[],
  t: Function /* international translator */
}

export interface irvWinnerSearch {
  firstRoundIndex: number,
  lastRoundIndex: number | null
};
