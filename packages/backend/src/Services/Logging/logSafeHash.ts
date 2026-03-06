import { createHmac, randomBytes } from "crypto";

// Per-process random secret. Not stable across pods or restarts,
// but impossible to recover from outside the running container.
const secret = randomBytes(32);

function getWeeklyKey(): Buffer {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekIndex = Math.floor(Date.now() / msPerWeek);
    return createHmac("sha256", secret).update(String(weekIndex)).digest();
}

/**
 * HMAC PII for log output. Produces a short, consistent hash that allows
 * correlating repeated events from the same identity within the same
 * process and ~7-day window, without exposing the raw value.
 */
export function logSafeHash(value: string | undefined | null): string {
    if (!value) return "[empty]";
    const key = getWeeklyKey();
    const hash = createHmac("sha256", key).update(value).digest("hex").slice(0, 12);
    return `[h:${hash}]`;
}
