// Ballot IDs for printed paper ballots. Each printed copy gets its own ID so that
// duplicates (a photocopied ballot, or one scanned twice) can be caught when counting.
//
// IDs are 10 characters of Crockford base32 (no I, L, O or U, so nothing is easily
// misread), shown as two groups of five: "K7Q2M-9XW3H". That's 50 random bits, so two
// copies sharing an ID by chance is vanishingly unlikely even across many print runs.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ID_LENGTH = 10;

const randomId = (): string => {
    const bytes = new Uint8Array(ID_LENGTH);
    crypto.getRandomValues(bytes);
    // 256 is a multiple of 32, so taking each byte mod 32 stays uniform.
    return Array.from(bytes, b => ALPHABET[b % 32]).join('');
};

// The ID as printed on the ballot.
export const formatBallotId = (id: string): string => `${id.slice(0, 5)}-${id.slice(5)}`;

// `count` distinct random IDs.
export const makeBallotIds = (count: number): string[] => {
    const ids = new Set<string>();
    while (ids.size < count) ids.add(randomId());
    return [...ids];
};
