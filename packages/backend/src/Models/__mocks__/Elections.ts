import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Uid } from '@equal-vote/star-vote-shared/domain_model/Uid';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';
import { IElectionStore } from '../IElectionStore';

export default class ElectionsDB implements IElectionStore {

    elections: Election[] = [];

    constructor() {
    }

    createElection(election: Election, ctx:ILoggingContext, reason:string): Promise<Election>{
        Logger.debug(ctx, "Election Mock Creates Election: ", election);
        var copy = JSON.parse(JSON.stringify(election));
        this.elections.push(copy);
        var res = JSON.parse(JSON.stringify(copy));
        return Promise.resolve(res);
    }

    
    updateElection(election: Election, ctx:ILoggingContext, reason:string): Promise<Election> {
        var foundIndex = this.elections.findIndex(dbElection => dbElection.election_id == election.election_id);
        if(foundIndex == -1){
            throw new Error("Election Not Found")
        }
        var copy = JSON.parse(JSON.stringify(election));
        this.elections[foundIndex] = copy;
        var res = JSON.parse(JSON.stringify(copy));
        return Promise.resolve(res);
    }

    getElections(id: string, email: string, ctx:ILoggingContext): Promise<Election[] | null> {
        var elections:Array<Election> = JSON.parse(JSON.stringify(this.elections));
        if(id != ""){
            var filters = id.split(',');
            
            for(var i = 0; i < id.length; i++){
                var [key, value] = id[i].split(':');
                elections = elections.filter(election => (election as any)[key]==String(value))
            }
        }
        if (!elections){
            return Promise.resolve(null)
        }
        return Promise.resolve(elections)
    }

    getElectionByID(election_id: Uid, ctx:ILoggingContext): Promise<Election | null>{
        Logger.debug(ctx, `Mock Election DB getElection ${election_id}`);
        const election = this.elections.find(election => {
            return election.election_id==election_id;
        });
        if (!election){
            Logger.info(ctx, `Mock DB could not find election ${election_id}`);
            Logger.debug(ctx, JSON.stringify(this.elections));
            return Promise.resolve(null)
        }
        return Promise.resolve(JSON.parse(JSON.stringify(election)))//Simple deep copy
    }

    electionExistsByID(election_id: Uid, ctx: ILoggingContext): Promise<boolean | string>{
        Logger.debug(ctx, `Mock Election DB electionExistsByID ${election_id}`);
        const election = this.elections.find(election => {
            return election.election_id==election_id;
        });
        return Promise.resolve(election? true : false);
    }

    delete(election_id: Uid, ctx:ILoggingContext, reason:string): Promise<boolean> {
        const election = this.elections.find(election => election.election_id==election_id)
        if (!election){
            return Promise.resolve(false)
        }
        this.elections = this.elections.filter(election => election.election_id!=election_id)
        return Promise.resolve(true)
    }
}