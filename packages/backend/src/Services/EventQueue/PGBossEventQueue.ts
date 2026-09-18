import { ILoggingContext } from "../Logging/ILogger";
import Logger from "../Logging/Logger";
import { EventHandler, IEventQueue, JobInsert, PublishOptions } from "./IEventQueue";
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

    public async publish(queue: QueueName, data: object, opts: PublishOptions = {}): Promise<string | null> {
        const throttle = opts.throttleKey && opts.throttleSeconds
            ? { singletonKey: opts.throttleKey, singletonSeconds: opts.throttleSeconds }
            : {};
        // pg-boss returns null (no throw) when the singleton slot is already taken.
        const job = await this._boss.send(queue, data, { retryLimit: 3, expireInSeconds: 60, ...throttle });
        return job;
    }
    
    public async publishBatch(queue: QueueName, data: object[]): Promise<object> {
        const Jobs: JobInsert[] = data.map((d) => ({
            name: queue,
            data: d
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