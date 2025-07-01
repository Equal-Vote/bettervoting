import { candidate, genericResults, genericSummaryData, rawVote, roundResults, vote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";

const Fraction = require('fraction.js');
declare namespace Intl {
  class ListFormat {
    constructor(locales?: string | string[], options?: {});
    public format: (items: string[]) => string;
  }
}
// converts list of strings to string with correct grammar ([a,b,c] => 'a, b, and c')
export const commaListFormatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

// Format a Timestamp value into a compact string for display;
function formatTimestamp(value : string) {
  const d = new Date(Date.parse(value));
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();
  const hour = d.getHours();
  const minute = d.getMinutes();

  const fullDate =
    year === currentYear
      ? `${month}/${date}`
      : year >= 2000 && year < 2100
        ? `${month}/${date}/${year - 2000}`
        : `${month}/${date}/${year}`;

  const timeStamp = `${fullDate} ${hour}:${minute}`;
  return timeStamp;
}



const isScore = (value : any) =>
  !isNaN(value) && (value === null || (value > -10 && value < 10));

const transformScore = (value : number) => {
  // minScore and maxScore were undefined when moving the file to typescript, so I'm hard coding them for now
  const minScore = 0;
  const maxScore = 5;
  value ? Math.min(maxScore, Math.max(minScore, value)) : 0;
}

// Functions to parse Timestamps
const isTimestamp = (value : any) => !isNaN(Date.parse(value));
const transformTimestamp = (value : any) => formatTimestamp(value);

// Functions to parse everything else
const isAny = (value : any) => true;
const transformAny = (value : any) => (value ? value.toString().trim() : "");

// Column types to recognize in Cast Vote Records passed as CSV data
const columnTypes = [
  { test: isScore, transform: transformScore },
  { test: isTimestamp, transform: transformTimestamp },
  // Last row MUST accept anything!
  { test: isAny, transform: transformAny }
];


function getTransforms(header : any, data : string[][]) {
  const transforms : any[] = [];
  const rowCount = Math.min(data.length, 3);
  header.forEach((title : string, n : number) => {
    var transformIndex = 0;
    if (title === "Timestamp") {
      transformIndex = 1;
    } else {
      for (let i = 0; i < rowCount; i++) {
        const value = data[i][n];
        const index = columnTypes.findIndex((element) => element.test(value));
        if (index > transformIndex) {
          transformIndex = index;
        }
        if (transformIndex >= columnTypes.length) {
          break;
        }
      }
    }
    // We don't have to check for out-of-bound index because
    // the last row in columnTypes accepts anything
    transforms.push(columnTypes[transformIndex].transform);
  });
  return transforms;
}

export const makeBoundsTest = (minValue:number, maxValue:number) => {
	return [
		'nOutOfBoundsVotes',
		(vote: rawVote) => Object.values(vote.marks).filter(b => b != null && (b < minValue || maxValue < b)).length > 0
	] as const;
}

export const makeAbstentionTest = (markAllEqualAsAbstention:boolean = false) => {
	return [
		'nAbstentions',
		(vote: rawVote) => {
            const marks = Object.values(vote.marks).map(m => m ?? 0);
            return marks.every(m => m === (markAllEqualAsAbstention ? marks[0] : 0));
        }
	] as const;
}

type StatTestPair = Readonly<[string, (vote: rawVote) => boolean]>;

const filterInitialVotes = (rawVotes: rawVote[], tests: StatTestPair[]): [vote[], {[key: string]: number}] => {
	let tallyVotes: vote[] = [];
	let summaryStats: {[key: string]: number} = {};

  tests.forEach(([statName, statTest]) => {
    summaryStats[statName] = 0;
  })
  summaryStats['nTallyVotes'] = 0;

  rawVotes.forEach(rawVote => {
    // using a classic loop so that I can return out of it
    for(let i = 0; i < tests.length; i++){
      let [statName, statTest] = tests[i]; 
      if(statTest(rawVote)){
        summaryStats[statName] = (summaryStats[statName] ?? 0)+1;
        return;
      }
    }
    summaryStats.nTallyVotes++;
    tallyVotes.push({
      ...rawVote,
      marks: Object.fromEntries(Object.entries(rawVote.marks).map(([c, v]) => [c, v ?? 0]))
    })
  })

  return [tallyVotes, summaryStats];
}

export type CandidateSortField<CandidateType extends candidate> = keyof CandidateType

export const sortCandidates = <CandidateType extends candidate>(
  candidates: CandidateType[],
  fieldsExpr: CandidateSortField<CandidateType>[] | CandidateSortField<CandidateType> | undefined,
  roundResults?: roundResults<CandidateType>[]
) => {
  if(fieldsExpr === undefined) return;
  const fields = Array.isArray(fieldsExpr) ? fieldsExpr : [fieldsExpr];

  const evalField = (candidate: CandidateType, field: CandidateSortField<CandidateType>, subIndex?: number) => {
    if(Array.isArray(candidate[field])){
      // @ts-ignore: typescript doesn't know candidate[field] is an array
      return candidate[field].at(subIndex ?? -1)
    }else{
      return candidate[field]
    }
  }

  const cmpr = (a: CandidateType, b: CandidateType, fieldIndex: number = 0, subIndex: number = -1): number => {
    if(fieldIndex >= fields.length) return 0;
    let aa = evalField(a, fields[fieldIndex], subIndex);
    let bb = evalField(b, fields[fieldIndex], subIndex);
    if(typeof aa == typeof Fraction){
      let diff = aa.sub(bb).mul(-1);
      if(!diff.equals(0)) return diff.valueOf();
    }else{
      let diff = -(aa - bb);
      if(diff != 0) return diff;
    }
    if(Array.isArray(a[fields[fieldIndex]]) && subIndex != 0){
      // @ts-ignore - we just established that it's an array, not sure why typescript is confused
      let l = a[fields[fieldIndex]].length;
      return cmpr(a, b, fieldIndex, (subIndex-1+l)%l)
    }else{
      return cmpr(a, b, fieldIndex+1);
    }
  }

  const winRound = (c: CandidateType) => {
    if(roundResults == undefined) return -1;
    let i = roundResults.findIndex(r => r.winners.map(w => w.id).includes(c.id))
    if(i == -1) return 999999; // I can't do infinity because Infinity can't equal Infinity for comparison purposes
    return i;
  }

  candidates.sort((a, b) => {
    let wDiff = winRound(a) - winRound(b);
    if(wDiff != 0) return wDiff;
    return cmpr(a, b);
  });
}

export const getSummaryData = <CandidateType extends candidate, SummaryType extends genericSummaryData<CandidateType>,>(
  candidates: CandidateType[],
	allVotes: rawVote[],
  methodType: 'cardinal' | 'ordinal',
  sortFields: CandidateSortField<CandidateType>[] | CandidateSortField<CandidateType> | undefined,
  statTests: StatTestPair[],
): {tallyVotes: vote[], summaryData: SummaryType} => {
	// Filter Ballots
	const [tallyVotes, summaryStats] = filterInitialVotes(allVotes, statTests);

  // Matrix for voter preferences
  const remapZero = (n:number) => n == 0 ? Infinity : n;
  candidates.forEach(a => {
    candidates.forEach(b => {
      a.votesPreferredOver[b.id] = tallyVotes.reduce((n, vote) => n + (methodType == 'cardinal'?
        // Cardinal systems: vote goes to the candinate with the higher number and 0 is infinity
        (vote.marks[a.id] > vote.marks[b.id])? 1 : 0
      :
        // Orindal systems: vote goes to the candinate with the smaller rank
        (remapZero(vote.marks[a.id]) < remapZero(vote.marks[b.id]))? 1 : 0
      ), 0)
    })
  })

  // Matrix for voter preferences
  candidates.forEach(a => {
    candidates.forEach(b => {
      a.winsAgainst[b.id] = a.votesPreferredOver[b.id] > b.votesPreferredOver[a.id];
    })
  })

  // Totaled score measures for each candidate
  if(candidates.every(c => 'score' in c)){ // using every to make typescript happy
    candidates.forEach(c => {
      // @ts-ignore - We know `score` is present even if typescript doesn't
      c.score = tallyVotes.reduce((score, vote) => score + vote.marks[c.id], 0)
    })   
  }

  // Compute copeland score based on matrix
  if(candidates.every(c => 'copelandScore' in c)){ // using every to make typescript happy
    candidates.forEach(c => {
      // @ts-ignore - We know `copelandScore` is present even if typescript doesn't
      c.copelandScore = candidates.reduce(
        (prev, other) => {
          // self
          if(c.id == other.id) return prev;
          // win
          if(c.winsAgainst[other.id]) return prev+1;
          // tie
          if(c.winsAgainst[other.id] === other.winsAgainst[c.id]) return prev+0.5;
          // loss
          return prev;
        }, 0
      )
    })   
  }

  // Compute fiveStarCount
  if(candidates.every(c => 'fiveStarCount' in c)){ // using every to make typescript happy
    candidates.forEach(c => {
      // @ts-ignore - We know `fiveStarCount` is present even if typescript doesn't
      c.fiveStarCount = tallyVotes.reduce((count, v) => v.marks[c.id] === 5 ? count+1 : count, 0)
    });
  }

  // hareScores is handled in irv tabulator
  // Compute hareScores (just adding first rounds for now, tabulator will add the rest)
  //if(candidates.every(c => 'hareScores' in c)){ // using every to make typescript happy
  //  candidates.forEach(c => {
  //    // @ts-ignore - We know `firstRankCount` is present even if typescript doesn't
  //    c.hareScores = [tallyVotes.reduce((count, v) => v.marks[c.id] === 1 ? count+1 : count, 0)]
  //  });
  //}


  // Pre-Sort by the sort field
  sortCandidates(candidates, sortFields);

  return {
    summaryData: {
      candidates,
      ...summaryStats,
    } as SummaryType,
    tallyVotes
  }
}

export const runBlocTabulator = <CandidateType extends candidate, SummaryType extends genericSummaryData<CandidateType>, ResultsType extends genericResults<CandidateType, SummaryType>,>(
	results: ResultsType,
	nWinners: number,
	singleWinnerCallback: (remainingCandidates: CandidateType[], summaryData: SummaryType) => roundResults<CandidateType>,
  evaluate?: (candidate: CandidateType, roundResults: roundResults<CandidateType>[]) => number[]
): ResultsType => {
  let remainingCandidates: CandidateType[] = [...results.summaryData.candidates];

  for(let w = 0; w < nWinners; w++){
    let roundResults = singleWinnerCallback(remainingCandidates, results.summaryData);

    results.elected.push(...roundResults.winners);
    results.roundResults.push(roundResults);

    // remove winner for next round
    remainingCandidates = remainingCandidates.filter(candidate => candidate.id != roundResults.winners[0].id)

    // only save the tie breaker info if we're in the final round
    if(w == nWinners-1){
      results.tied = roundResults.tied; 
      results.tieBreakType = roundResults.tieBreakType; // only save the tie breaker info if we're in the final round
    }
  }

  results.other = remainingCandidates; // remaining candidates in sortedScores

  if(evaluate){
    // evaulate() converts candidates into an number[] of evaluation scores
    // candidates with higher evaluation scores will be sorted higher
    // index 0 is checked first, then further indexes are checked to break ties

    results.summaryData.candidates = 
      results.summaryData.candidates
        .map((c: CandidateType) => ([c, evaluate(c, results.roundResults)] as [CandidateType, number[]]))
        .sort(([_, a]: [candidate, number[]], [__, b] : [candidate, number[]]) => {
          const compare = (a: number[], b: number[], i: number): number => {
            if(i > a.length || i > b.length) return 0;
            let diff = -(a[i] - b[i]);
            return diff == 0 ? compare(a, b, i+1) : diff;
          };
          return compare(a, b, 0)
        }) 
        .map(([c, _]: [CandidateType, number[]]) => c)
  }

  return results
}
