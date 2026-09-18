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
// Options for a single enqueue. throttleKey + throttleSeconds map onto pg-boss's
// singletonKey/singletonSeconds: at most one job with that key is accepted per
// throttleSeconds time slot; a duplicate is dropped and publish resolves null.
export interface PublishOptions {
    throttleKey?: string;
    throttleSeconds?: number;
}
export interface IEventQueue {
    subscribe(queue:QueueName, handler:EventHandler):void;
    publish(queue:QueueName, data:object, opts?:PublishOptions):Promise<string | null>;
    publishBatch(queue:QueueName, data:object):Promise<object>;
    clearStorage():Promise<void>;
    debugInfo():Promise<string>;
};