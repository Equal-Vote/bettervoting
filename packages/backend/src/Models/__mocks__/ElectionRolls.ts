import { ElectionRoll, ElectionRollAction, ElectionRollState } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { ILoggingContext } from '../../Services/Logging/ILogger';
import Logger from '../../Services/Logging/Logger';
import { IElectionRollStore } from '../IElectionRollStore';

export default class ElectionRollDB implements IElectionRollStore{

    _electionRolls: ElectionRoll[] = []
    nextId = 0;

    constructor() {
        this._electionRolls = [];
    }

    submitElectionRoll(electionRolls: ElectionRoll[], ctx:ILoggingContext,reason:string): Promise<boolean>{
        const self = this;
        electionRolls.forEach(function(roll){
            Logger.debug(ctx, `Mock Election Roll Store:  submit:  ${JSON.stringify(roll)}`);
            var existing = self._electionRolls.find(x => x.election_id==roll.election_id && x.voter_id==roll.voter_id)
            if (existing){
                Logger.error(ctx, `Already have conflicting voter roll entry!  ${JSON.stringify(existing)}`);
            }
            var copy:ElectionRoll = JSON.parse(JSON.stringify(roll));
            self._electionRolls.push(copy);
        });
        return Promise.resolve(true)
    }

    getRollsByElectionID(election_id: string, ctx:ILoggingContext): Promise<ElectionRoll[] | null> {
        const electionRolls = this._electionRolls.filter(roll => roll.election_id===election_id)
        if (!electionRolls){
            return Promise.resolve(null)
        }
        const res:ElectionRoll[] = JSON.parse(JSON.stringify(electionRolls));
        return Promise.resolve(res);
    }

    getByVoterID(election_id: string,voter_id:string, ctx:ILoggingContext): Promise<ElectionRoll | null> {
        Logger.debug(ctx, `MockElectionRolls getByVoterID ${election_id}, voter:${voter_id}`);
        const roll = this._electionRolls.find(electionRolls => electionRolls.election_id==election_id && electionRolls.voter_id==voter_id)

        if (!roll){
            Logger.debug(ctx, "Mock ElectionRoll DB could not match election and voter. Current data:\n"+JSON.stringify(this._electionRolls));
            return Promise.resolve(null)
        }
        Logger.debug(ctx, `MockElectionRolls returns ${JSON.stringify(roll)}`);
        const res:ElectionRoll = JSON.parse(JSON.stringify(roll));
        return Promise.resolve(res)
    }

    getElectionRoll(election_id: string, voter_id: string|null, email: string|null, ip_hash: string|null, ctx:ILoggingContext): Promise<[ElectionRoll] | null> {
        Logger.debug(ctx, `MockElectionRolls get election:${election_id}, voter_id:${voter_id}, email: ${email}, ip_hash: ${ip_hash}`);
        let roll = this._electionRolls.filter(electionRolls => {
            if (electionRolls.election_id!==election_id) return false
            if (ip_hash && electionRolls.ip_hash===ip_hash) return true
            if (voter_id && electionRolls.voter_id ===voter_id) return true
            if (email && electionRolls.email === email) return true
            return false
        })

        if (!roll || roll.length===0){
            Logger.debug(ctx, "Mock ElectionRoll DB could not match election and voter. Current data:\n"+JSON.stringify(this._electionRolls));
            return Promise.resolve(null)
        }
        Logger.debug(ctx, `MockElectionRolls returns ${JSON.stringify(roll)}`);
        const res:[ElectionRoll] = JSON.parse(JSON.stringify(roll));
        return Promise.resolve(res)
    }

    update(voter_roll: ElectionRoll, ctx: ILoggingContext, reason: string, db?: any): Promise<ElectionRoll | null> {
        Logger.debug(ctx, `MockElectionRolls update ${JSON.stringify(voter_roll)}`);
        const index = this._electionRolls.findIndex(electionRoll => {
            var electionMatch = electionRoll.election_id===voter_roll.election_id;
            var voterMatch = electionRoll.voter_id===voter_roll.voter_id;
            return electionMatch && voterMatch
        });
        if (index < 0){
            return Promise.resolve(null)
        }
        var copy = JSON.parse(JSON.stringify(voter_roll));
        this._electionRolls[index] = copy;
        var res = JSON.parse(JSON.stringify(copy));
        return Promise.resolve(res);
    }

    delete(voter_roll: ElectionRoll, ctx:ILoggingContext,reason:string): Promise<boolean> {
        const ballot = this._electionRolls.find(electionRoll => electionRoll.election_id===voter_roll.election_id && electionRoll.voter_id===voter_roll.voter_id)
        if (!ballot){
            return Promise.resolve(false)
        }
        this._electionRolls = this._electionRolls.filter(electionRoll => electionRoll.election_id!==voter_roll.election_id || electionRoll.voter_id!==voter_roll.voter_id)
        return Promise.resolve(true)
    }
}