import { randomUUID } from "crypto";
import { EventHandler, IEventQueue, PublishBatchOptions } from "./IEventQueue";
import { QueueName } from "./QueueName";

type Job = {
    queue: QueueName,
    id: string,
    data: object
}

export class MockEventQueue implements IEventQueue {

    private _delay = 1000;
    
    private _handlers:Map<QueueName,EventHandler> = new Map();
    private _pendingJobs:Array<Job> = [];
    private _working:boolean = false;
    private _paused:boolean = false;


    constructor(){
    }

    public subscribe(queue:QueueName, handler:EventHandler):void {
        if (this._handlers.has(queue)){
            console.error("ERROR: already have handler for queue "+queue);
        }
        this._handlers.set(queue, handler);
    }

    public async publish(queue:QueueName, data:object):Promise<string> {
        const j = {
            queue: queue,
            data: data,
            id: randomUUID()
        }
        this._pendingJobs.push(j);
        this.triggerJobs();
        return j.id;
    }

    // spacingMs is accepted for signature parity but ignored: the mock runs jobs
    // immediately so tests don't have to wait out a schedule.
    public async publishBatch(queue:QueueName, data:object[], _opts?:PublishBatchOptions):Promise<object> {
        const j = data.map(d => ({
            queue: queue,
            data: d,
            id: randomUUID()
        }))
        this._pendingJobs.push(...j);
        this.triggerJobs();
        return j;
    }

    // Tests trigger scheduled handlers directly; the mock only records the schedule.
    public schedules: Map<QueueName, string> = new Map();
    public async schedule(queue:QueueName, cron:string):Promise<void> {
        this.schedules.set(queue, cron);
    }

    public async countUnstarted(queue:QueueName, electionId:string):Promise<number> {
        return this._pendingJobs.filter(j => j.queue === queue && (j.data as { election_id?: string })?.election_id === electionId).length;
    }

    private async triggerJobs(){
        if (this._working){
            return;
        }
        if (this._paused){
            return
        }
        this._working = true;
        await new Promise(r => setTimeout(r, this._delay));
        await this.processNextJob();
    }

    private async processNextJob(){
        const j = this._pendingJobs.shift();
        if (!j){
            console.info("Event queue empty");
            this._working = false;
            return;
        }
        try {
            console.info("MEQ: Processing job: " + JSON.stringify(j));
            await this.doJob(j);
        } catch (_e: unknown) {
            console.info("MEQ: Exception handling job: " + JSON.stringify(j));
        }
        this._working = false;
        this.triggerJobs();
    }

    private async doJob(job:Job){
        const h = this._handlers.get(job.queue);
        if (!h){
            console.info("ERROR: no handler for queue "+job.queue);
            return;
        }
        await h(job);
    }

    public pause(){
        this._paused = true;
    }

    public resume(){
        this._paused = false;
        this.triggerJobs();
    }

    public async clearStorage():Promise<void> {
        this._pendingJobs = [];
    }

    public async debugInfo():Promise<string> {
        return "MEQ Debug:  " + JSON.stringify(this._pendingJobs);
    }

    public async waitUntilJobsFinished():Promise<void> {
        while(this._pendingJobs.length > 0){
            await new Promise(r => setTimeout(r, this._delay));
        }
    }


}