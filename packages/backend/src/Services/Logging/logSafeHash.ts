import { createHmac, randomBytes } from "crypto";

// Base secret: from env, or a random per-process fallback.
// The fallback means hashes won't survive restarts, but it's safe by default.
const baseSecret = process.env.LOG_HMAC_SECRET || randomBytes(32).toString("hex");

function getWeeklyKey(): Buffer {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekIndex = Math.floor(Date.now() / msPerWeek);
    return createHmac("sha256", baseSecret).update(String(weekIndex)).digest();
}

/**
 * HMAC PII for log output. Produces a short, consistent hash that allows
 * correlating repeated events from the same identity within a ~7-day window
 * without exposing the raw value.
 *
 * Key derivation: HMAC(baseSecret, weekIndex) produces a weekly key,
 * then HMAC(weeklyKey, value) produces the hash. The base secret comes
 * from LOG_HMAC_SECRET env var, or a per-process random if unset.
 */
export function logSafeHash(value: string | undefined | null): string {
    if (!value) return "[empty]";
    const key = getWeeklyKey();
    const hash = createHmac("sha256", key).update(value).digest("hex").slice(0, 12);
    return `[h:${hash}]`;
}
