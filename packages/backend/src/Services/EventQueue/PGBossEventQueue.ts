import { ILoggingContext } from "../Logging/ILogger";
import Logger from "../Logging/Logger";
import { EventHandler, IEventQueue, JobInsert, PublishBatchOptions } from "./IEventQueue";
import { QueueName } from "./QueueName";



export default class PGBossEventQueue implements IEventQueue {

    _boss: any;

    constructor() {
    }

    public async init(pgConnection: object, ctx: ILoggingContext): Promise<PGBossEventQueue> {
        const PgBoss = require('pg-boss');
        this._boss = new PgBoss(pgConnection);
        this._boss.on('error', (error: any) => Logger.error(ctx, error));

        await this._boss.start();
        return this;
    }

    public async publish(queue: QueueName, data: object): Promise<string> {
        const job = await this._boss.send(queue, data, { retryLimit: 3, expireInSeconds: 60 });
        return job;
    }
    
    public async publishBatch(queue: QueueName, data: object[], opts: PublishBatchOptions = {}): Promise<object> {
        // Retry/expiry are deliberately NOT defaulted here (pg-boss insert() default is
        // retrylimit 0). The email handlers call SendGrid before they record the send,
        // so a retry after a partial failure re-sends the email. Callers that have an
        // idempotent handler can opt in explicitly.
        const spacingMs = opts.spacingMs ?? 0;
        const base = Date.now();
        const Jobs: JobInsert[] = data.map((d, i) => ({
            name: queue,
            data: d,
            ...(opts.retryLimit !== undefined ? { retryLimit: opts.retryLimit } : {}),
            ...(opts.expireInSeconds !== undefined ? { expireInSeconds: opts.expireInSeconds } : {}),
            ...(spacingMs > 0 ? { startAfter: new Date(base + i * spacingMs) } : {}),
        }))
        const jobs = await this._boss.insert(Jobs);
        return jobs;
    }

    public subscribe(queue: QueueName, handler: EventHandler): void {
        const options = { newJobCheckInterval: 500, teamSize: 5 };
        this._boss.work(queue, options, handler);
    }

    async debugInfo(): Promise<string> {
        const states = await this._boss.countStates();
        return JSON.stringify(states.queues["test-queue"]);
    }

    async clearStorage(): Promise<void> {
        this._boss.clearStorage();
    }
}