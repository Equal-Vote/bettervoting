// How fast to release queued emails. Expressed as a per-job spacing so the queue
// can stagger startAfter; the rate itself comes from EMAIL_SEND_RATE_PER_MINUTE.
//
// Default 600/min (10/s) matches the throughput the workers achieve unpaced, so
// setting nothing changes nothing. Lower it for a large send to a domain that has
// never sent at that volume: reputation systems react to a sudden spike, and a
// slower drain leaves time to watch bounces and cancel the un-started jobs if
// they climb. The pacing is in the job rows (pgboss.job.startafter), so it
// survives a restart and is not affected by replica count.
export const DEFAULT_EMAIL_SEND_RATE_PER_MINUTE = 600;

export function emailSendRatePerMinute(): number {
    const n = Number(process.env.EMAIL_SEND_RATE_PER_MINUTE);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_EMAIL_SEND_RATE_PER_MINUTE;
}

export function emailSendSpacingMs(): number {
    return 60_000 / emailSendRatePerMinute();
}

// For logging the plan when a batch is enqueued.
export function describeSendPlan(count: number): string {
    const rate = emailSendRatePerMinute();
    const minutes = count / rate;
    const dur = minutes < 1 ? `${Math.round(minutes * 60)}s` : `${minutes.toFixed(1)} min`;
    return `${count} emails at ${rate}/min (~${dur})`;
}
