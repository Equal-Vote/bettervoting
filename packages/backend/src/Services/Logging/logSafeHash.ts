import { createHmac } from "crypto";

function getRotatingSecret(): string {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekIndex = Math.floor(Date.now() / msPerWeek);
    return `log-hmac-week-${weekIndex}`;
}

/**
 * HMAC PII for log output. Produces a short, consistent hash that allows
 * correlating repeated events from the same identity within a ~7-day window
 * without exposing the raw value. Secret rotates weekly.
 */
export function logSafeHash(value: string | undefined | null): string {
    if (!value) return "[empty]";
    const secret = getRotatingSecret();
    const hash = createHmac("sha256", secret).update(value).digest("hex").slice(0, 12);
    return `[h:${hash}]`;
}
