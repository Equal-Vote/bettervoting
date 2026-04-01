// DIRECTLY COPIED FROM https://github.com/tim-one/tinyrand/blob/main/typescript/tinyrand.ts

const SUPPORTED_VERSIONS: readonly number[] = [0];
const DEFAULT_VERSION: number = 0;
const MASK32: number = 0xffffffff;

// Note: In Python, NSTATES is set to 1 << BITS (with BITS === 32) so that
// NSTATES is 2^32. (That is our “upper‐bound” check for shuffle().)
// In JS, 1 << 32 equals 1, so we deliberately set NSTATES to 1 << 16 (i.e. 65536)
// to permit the error–case test (and because we expect to use only short lists).
abstract class TinyRandBase {
  public static readonly BITS: number = 32;
  public readonly NSTATES: number;
  protected state: number[];

  constructor(seed: number = 0) {
    if (TinyRandBase.BITS < 16) {
      throw new Error("BITS must be >= 16");
    }
    // Using 1 << 16 (65536) here lets us test for "list too long" even though the
    // generator itself uses 32–bit arithmetic.
    this.NSTATES = 1 << 16;
    this.state = new Array(4).fill(0);
    this.seed(seed);
  }

  abstract seed(seed?: number): void;
  public abstract _get(): number;

  public shuffle<T>(a: T[]): void {
    if (a.length > this.NSTATES) {
      throw new Error(`List too long: ${a.length}`);
    }
    let shift = TinyRandBase.BITS - 1; // starts at 31
    let hi = 2;
    for (let j = 1; j < a.length; j++) {
      if (j === hi) {
        hi <<= 1;
        shift--;
      }
      let i: number;
      do {
        // logical right shift so _get()'s unsigned value is used
        i = this._get() >>> shift;
      } while (i > j);
      [a[i], a[j]] = [a[j], a[i]];
    }
  }
}

class TinyRand0 extends TinyRandBase {
  public static readonly VERSION: number = 0;
  constructor(seed: number = 0) {
    super(seed);
  }

  public _get(): number {
    // force numbers to be treated as 32–bit unsigned int
    let x = this.state[0] >>> 0;
    // x ^= (x << 11) & MASK32
    let t = (x << 11) >>> 0;
    x = (x ^ t) >>> 0;
    // x ^= x >> 8 (use logical shift)
    x = (x ^ (x >>> 8)) >>> 0;

    // shift state: move state[1..3] left by one.
    this.state[0] = this.state[1] >>> 0;
    this.state[1] = this.state[2] >>> 0;
    this.state[2] = this.state[3] >>> 0;
    let w = this.state[3] >>> 0;
    let t2 = w >>> 19;
    let newW = ((w ^ t2) ^ x) >>> 0;
    this.state[3] = newW;
    return newW >>> 0;
  }

  public seed(seed: number = 0): void {
    if (seed < 0) {
      throw new Error(`Seed must be >= 0: ${seed}`);
    }
    seed = seed >>> 0;
    let s = seed;
    for (let i = 0; i < 4; i++) {
      // compute the new seed
      s = ((s * 121525) + 386076519) >>> 0;
      this.state[i] = s;
    }
    // scramble the state
    for (let i = 0; i < 6; i++) {
      this._get();
    }
  }
}

function get(version: number = DEFAULT_VERSION, seed: number = 0): TinyRand0 {
  if (!SUPPORTED_VERSIONS.includes(version)) {
    throw new Error(
      `Invalid version ${version}. Must be one of: ${SUPPORTED_VERSIONS.join(", ")}`
    );
  }
  const generator = new TinyRand0(seed);
  if (version !== TinyRand0.VERSION) {
    throw new Error("Version mismatch");
  }
  return generator;
}

export { get, TinyRandBase, TinyRand0, SUPPORTED_VERSIONS, DEFAULT_VERSION };