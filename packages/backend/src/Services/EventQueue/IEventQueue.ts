import { QueueName } from "./QueueName";

export type EventHandler = (job: { id: string; data: object; }) => Promise<void>;
export interface JobInsert<T = object> {
    id?: string,
    name: string;
    data?: T;
    priority?: number;
    retryLimit?: number;
    retryDelay?: number;
    retryBackoff?: boolean;
    startAfter?: Date | string;
    singletonKey?: string;
    expireInSeconds?: number;
    keepUntil?: Date | string;
    onComplete?: boolean
}
// Options for a batch enqueue. spacingMs > 0 staggers each job's startAfter so
// the batch drains at a chosen rate instead of as fast as the workers can pull --
// the pacing lives in the queue rows themselves, so it survives restarts and can
// be inspected or cancelled by looking at pgboss.job.
export interface PublishBatchOptions {
    spacingMs?: number;
    // Opt-in only. Not defaulted: the email handlers send before they record, so a
    // retry after a partial failure would re-send. See PGBossEventQueue.publishBatch.
    retryLimit?: number;
    expireInSeconds?: number;
}
export interface IEventQueue {
    subscribe(queue:QueueName, handler:EventHandler):void;
    publish(queue:QueueName, data:object):Promise<string>;
    publishBatch(queue:QueueName, data:object[], opts?:PublishBatchOptions):Promise<object>;
    // Jobs on `queue` for this election that have not started yet (created or awaiting
    // retry). Jobs must carry a top-level `election_id` in their data to be counted.
    countUnstarted(queue:QueueName, electionId:string):Promise<number>;
    clearStorage():Promise<void>;
    debugInfo():Promise<string>;
};