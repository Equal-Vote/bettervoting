// How fast to release queued emails. Expressed as a per-job spacing so the queue
// can stagger startAfter; the rate itself comes from EMAIL_SEND_RATE_PER_MINUTE.
//
// Default 600/min (10/s) matches the throughput the workers achieve unpaced, so
// setting nothing changes nothing. Lower it for a large send to a domain that has
// never sent at that volume: reputation systems react to a sudden spike, and a
// slower drain leaves time to watch bounces and cancel the un-started jobs if
// they climb. The pacing is in the job rows (pgboss.job.startafter), so it
// survives a restart and is not affected by replica count.
import { BadRequest } from "@curveball/http-errors";
import { IEventQueue } from "../EventQueue/IEventQueue";

export const DEFAULT_EMAIL_SEND_RATE_PER_MINUTE = 600;

export const SendEmailEventQueue = "sendEmailEvent";
export const SendInviteEventQueue = "sendInviteEvent";

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

// In-flight guard: refuse to start a new blast to an election while a previous one
// (invite or campaign) still has un-started jobs. Without this a double-click, or an
// admin re-running "send" because the first looked slow, stacks a second full blast
// behind the first -- on a large paced send that is another several hours of queue,
// and every voter hears from us twice. The wait is estimated from the pacing rate so
// the error can say when it will be clear.
export async function assertNoSendInFlight(queue: IEventQueue, electionId: string): Promise<void> {
    const [campaign, invite] = await Promise.all([
        queue.countUnstarted(SendEmailEventQueue, electionId),
        queue.countUnstarted(SendInviteEventQueue, electionId),
    ]);
    const remaining = campaign + invite;
    if (remaining === 0) return;
    const minutes = (remaining * emailSendSpacingMs()) / 60_000;
    const eta = minutes < 1 ? 'under a minute' : minutes < 90 ? `about ${Math.ceil(minutes)} minutes` : `about ${(minutes / 60).toFixed(1)} hours`;
    throw new BadRequest(
        `A send to this election is still in progress: ${remaining.toLocaleString()} emails remaining, ${eta} at the current rate. Wait for it to finish before starting another.`);
}
