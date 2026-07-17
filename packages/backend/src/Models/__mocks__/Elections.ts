import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Uid } from '@equal-vote/star-vote-shared/domain_model/Uid';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';
import { IElectionStore } from '../IElectionStore';
import { Conflict } from '@curveball/http-errors';
import BallotsDB from './Ballots';

export default class ElectionsDB implements IElectionStore {

    elections: Election[] = [];
    _ballotsDb: BallotsDB | null = null;

    constructor(ballotsDb: BallotsDB | null = null) {
        this._ballotsDb = ballotsDb;
    }

    createElection(election: Election, ctx:ILoggingContext, reason:string): Promise<Election>{
        Logger.debug(ctx, "Election Mock Creates Election: ", election);
        var copy = JSON.parse(JSON.stringify(election));
        copy.update_date = Date.now().toString();
        copy.create_date = new Date().toISOString();
        this.elections.push(copy);
        var res = JSON.parse(JSON.stringify(copy));
        return Promise.resolve(res);
    }


    updateElection(election: Election, ctx:ILoggingContext, reason:string, expected_update_date: string): Promise<Election> {
        var foundIndex = this.elections.findIndex(dbElection => dbElection.election_id == election.election_id);
        if(foundIndex == -1){
            throw new Error("Election Not Found")
        }
        if (this.elections[foundIndex].update_date !== expected_update_date) {
            throw new Conflict("Concurrent write detected, please try again")
        }
        var copy = JSON.parse(JSON.stringify(election));
        copy.update_date = Date.now().toString();
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

    getElectionRacesForAllElections(ctx: ILoggingContext): Promise<Pick<Election, 'election_id' | 'owner_id' | 'races' | 'create_date'>[] | null> {
        return Promise.resolve(
            this.elections.map(e => ({
                election_id: e.election_id,
                owner_id: e.owner_id,
                races: e.races ?? [],
                create_date: e.create_date ?? new Date().toISOString(),
            }))
        );
    }

    getElectionsSourcedFromPrior(ctx: ILoggingContext): Promise<Election[] | null> {
        return Promise.resolve(
            this.elections.filter(e => (e as any).ballot_source === 'prior_election')
        );
    }

    getBallotCountsForAllElections(ctx: ILoggingContext): Promise<{ election_id: string; v: number }[] | null> {
        if (!this._ballotsDb) return Promise.resolve([]);

        const counts: Record<string, number> = {};
        this._ballotsDb.ballots
            .filter((b: Ballot) => b.status === 'submitted')
            .forEach((b: Ballot) => {
                counts[b.election_id] = (counts[b.election_id] ?? 0) + 1;
            });

        return Promise.resolve(
            Object.entries(counts).map(([election_id, v]) => ({ election_id, v }))
        );
    }
}
