import { ILoggingContext } from "../Logging/ILogger";
import Logger from "../Logging/Logger";
import { EventHandler, IEventQueue, JobInsert } from "./IEventQueue";
import { QueueName } from "./QueueName";
import PgBoss from 'pg-boss';

export default class PGBossEventQueue implements IEventQueue {

    // Untyped: pg-boss's installed API (send()/insert()/countStates()) has drifted from what
    // this class assumes (e.g. debugInfo()'s countStates() call doesn't exist on the current
    // types), pre-dating this pass. Typing it properly means reconciling that drift, which is
    // out of scope here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _boss: any;

    constructor() {
    }

    public async init(pgConnection: object, ctx: ILoggingContext): Promise<PGBossEventQueue> {
        this._boss = new PgBoss(pgConnection);
        this._boss.on('error', (error: unknown) => Logger.error(ctx, error));

        await this._boss.start();
        return this;
    }

    public async publish(queue: QueueName, data: object): Promise<string> {
        const job = await this._boss.send(queue, data, { retryLimit: 3, expireInSeconds: 60 });
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