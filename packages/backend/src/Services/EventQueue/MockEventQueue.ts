import { randomUUID } from "crypto";
import { EventHandler, IEventQueue } from "./IEventQueue";
import { QueueName } from "./QueueName";

type Job = {
    queue: QueueName,
    id: string,
    data: object
}

/**
 * In-memory stand-in for PGBossEventQueue. pg-boss keeps its jobs in Postgres,
 * so the backend unit tests — which run entirely against in-memory fakes — need
 * a substitute rather than the real thing.
 *
 * Jobs run inline: publish() does not resolve until its handlers have finished.
 * That keeps tests deterministic and leaves nothing scheduled once a test file
 * ends. When a test needs to observe the state *between* "job enqueued" and
 * "job handled" — e.g. to check that a response is sent without waiting on the
 * queue — use pause() / resume() rather than a sleep.
 */
export class MockEventQueue implements IEventQueue {

    private _handlers:Map<QueueName,EventHandler> = new Map();
    private _pendingJobs:Array<Job> = [];
    private _draining:boolean = false;
    private _paused:boolean = false;

    public subscribe(queue:QueueName, handler:EventHandler):void {
        if (this._handlers.has(queue)){
            console.error("ERROR: already have handler for queue "+queue);
        }
        this._handlers.set(queue, handler);
    }

    public async publish(queue:QueueName, data:object):Promise<string> {
        const job = {
            queue: queue,
            data: data,
            id: randomUUID()
        }
        this._pendingJobs.push(job);
        await this.drain();
        return job.id;
    }

    public async publishBatch(queue:QueueName, data:object[]):Promise<object> {
        const jobs = data.map(d => ({
            queue: queue,
            data: d,
            id: randomUUID()
        }))
        this._pendingJobs.push(...jobs);
        await this.drain();
        return jobs;
    }

    /**
     * Runs every pending job to completion. Does nothing while paused, and is
     * re-entrant safe: a handler that publishes another job leaves it for the
     * loop already running rather than starting a nested one.
     */
    public async drain():Promise<void> {
        if (this._paused || this._draining){
            return;
        }
        this._draining = true;
        try {
            var job = this._pendingJobs.shift();
            while (job){
                await this.doJob(job);
                job = this._pendingJobs.shift();
            }
        } finally {
            this._draining = false;
        }
    }

    private async doJob(job:Job){
        const h = this._handlers.get(job.queue);
        if (!h){
            console.info("ERROR: no handler for queue "+job.queue);
            return;
        }
        try {
            await h(job);
        } catch (e:any) {
            // pg-boss retries a failed job; the mock just reports it, so that a
            // broken handler shows up in the test output instead of vanishing.
            console.info(`MEQ: Exception handling job ${job.id} on ${job.queue}: ${e?.stack ?? e}`);
        }
    }

    public pause(){
        this._paused = true;
    }

    public async resume(){
        this._paused = false;
        await this.drain();
    }

    public pendingJobCount():number {
        return this._pendingJobs.length;
    }

    public async clearStorage():Promise<void> {
        this._pendingJobs = [];
    }

    public async debugInfo():Promise<string> {
        return "MEQ Debug:  " + JSON.stringify(this._pendingJobs);
    }
}
