// Recommended lengths for different ID types
export const ID_LENGTHS = {
  BALLOT: 8,     // b-12345678
  VOTER: 8,      // v-12345678
  CANDIDATE: 3,  // c-123
  RACE: 3,       // r-123
  ELECTION: 6,   // e-123456
} as const;

// Prefix for different ID types
export const ID_PREFIXES = {
  BALLOT: 'b',
  CANDIDATE: 'c',
  RACE: 'r',
  VOTER: 'v',
  VOTER_DISCORD: 'vd',
  VOTER_SLACK: 'vs',
} as const;

// nota = none of the above, this won't collide with the standard pattern because it has vowels, and the id length is different
export const NOTA_ID = 'c-nota'; 

// Removing vowels to avoid spelling real words in IDS (especially don't want curse words)
// also removing o/0 and 1/l to avoid confusion if someone was manually copying the 
// https://stackoverflow.com/questions/956556/is-it-irrational-to-sanitize-random-character-strings-for-curse-words
function generateRandomPart(length: number): string {
  const options = 'bcdfghjkmpqrtvwxy2346789';
  return [...Array(length)]
    .map(_ => options.charAt(Math.floor(Math.random()*options.length)))
    .join('');
}

// Synchronous version for simple ID generation
export function makeID(prefix: string = '', length: number): string {
  const randomPart = generateRandomPart(length);
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

// Common constants
const MAX_ITERATIONS = 10;

// Async version for when collision checking is needed
export async function makeUniqueID(
  prefix: string | null = null, 
  length: number,
  hasCollision: (id: string) => Promise<boolean>
): Promise<string> {
  let i = 0;
  let currentId = makeID(prefix || '', length);
  
  while(i < MAX_ITERATIONS && await hasCollision(currentId)) {
    currentId = makeID(prefix || '', length);
    i++;
  }
  
  if(i === MAX_ITERATIONS) throw new Error("Failed to generate unique ID");
  return currentId;
}

// Dev election constants and helpers
export const DEV_ELECTION_PREFIX = 'devtest';

export function devElectionId(name: string): string {
    return `${DEV_ELECTION_PREFIX}${name}`;
}

export function devBallotId(electionId: string, index: number): string {
    return `${ID_PREFIXES.BALLOT}-${electionId}-ballot${index}`;
}

export function devBallotIdPrefix(electionId: string): string {
    return `${ID_PREFIXES.BALLOT}-${electionId}-ballot`;
}

export function validateDevElectionId(electionId: string): void {
    if (!electionId.startsWith(DEV_ELECTION_PREFIX)) {
        throw new Error(`Election ID "${electionId}" must start with "${DEV_ELECTION_PREFIX}"`);
    }
}

export function validateDevBallotId(ballotId: string, electionId: string): void {
    const expectedPrefix = devBallotIdPrefix(electionId);
    if (!ballotId.startsWith(expectedPrefix)) {
        throw new Error(`Ballot ID "${ballotId}" must start with "${expectedPrefix}" — use devBallotId() to generate ballot IDs`);
    }
}

// Synchronous version for when collision checking is needed but async isn't required
export function makeUniqueIDSync(
  prefix: string | null = null, 
  length: number,
  hasCollision: (id: string) => boolean
): string {
  let i = 0;
  let currentId = makeID(prefix || '', length);
  
  while(i < MAX_ITERATIONS && hasCollision(currentId)) {
    currentId = makeID(prefix || '', length);
    i++;
  }
  
  if(i === MAX_ITERATIONS) throw new Error("Failed to generate unique ID");
  return currentId;
}
