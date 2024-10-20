import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { BadRequest } from "@curveball/http-errors";
import { Election, removeHiddenFields } from '@equal-vote/star-vote-shared/domain_model/Election';
import { IElectionRequest, IRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';


var ElectionsModel = ServiceLocator.electionsDb();
var ElectionRollModel = ServiceLocator.electionRollDb();

const getElections = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `getElections`);
    // var filter = (req.query.filter == undefined) ? "" : req.query.filter;
    const email = req.user?.email || ''
    const id = req.user?.sub || ''

    /////////// ELECTIONS WE OWN ////////////////
    var elections_as_official = null;
    if(email !== '' || id !== ''){ 
        elections_as_official = await ElectionsModel.getElections(id, email, req);
        if (!elections_as_official) {
            var msg = "Election does not exist";
            Logger.info(req, msg);
            throw new BadRequest(msg);
        }
        elections_as_official.forEach((elec: Election) => {
            removeHiddenFields(elec, null);
        })
    }

    /////////// ELECTIONS WE'RE INVITED TO ////////////////
    var elections_as_unsubmitted_voter = null;
    if (email !== '') {
        let myRolls = await ElectionRollModel.getByEmailAndUnsubmitted(email, req)
        let election_ids = myRolls?.map(election => election.election_id)
        if (election_ids && election_ids.length > 0) {
            elections_as_unsubmitted_voter = await ElectionsModel.getElectionByIDs(election_ids,req)
            // we only want the election to show up in the invited list if it's private
            // if it's public then it's possible for you to be added to the voter roll by opening the election, and that shouldn't count as an invitation
            // NOTE: I can't add this to getByEmailAndUnsubmitted because we can't query for voter_access directly
            elections_as_unsubmitted_voter = elections_as_unsubmitted_voter?.filter(election => election.settings.voter_access != 'open');
        }
    }

    /////////// ELECTIONS WE'VE VOTED IN ////////////////
    var elections_as_submitted_voter = null;
    if (email !== '') {
        let myRolls = await ElectionRollModel.getByEmailAndSubmitted(email, req)
        let election_ids = myRolls?.map(election => election.election_id)
        if (election_ids && election_ids.length > 0) {
            elections_as_submitted_voter = await ElectionsModel.getElectionByIDs(election_ids,req)
        }
    }

    /////////// OPEN ELECTIONS ////////////////
    var open_elections = await ElectionsModel.getOpenElections(req);

    res.json({
        elections_as_official,
        elections_as_unsubmitted_voter,
        elections_as_submitted_voter,
        open_elections
    });
}

const innerGetGlobalElectionStats = async (req: IRequest) => {
    Logger.info(req, `getGlobalElectionStats `);

    let electionVotes = await ElectionsModel.getBallotCountsForAllElections(req);

    let stats = {
        elections: Number(process.env.CLASSIC_ELECTION_COUNT ?? 0),
        votes: Number(process.env.CLASSIC_VOTE_COUNT ?? 0),
    };

    electionVotes?.map(m => m['v'])?.forEach((count) => {
        stats['votes'] = stats['votes'] + Number(count);
        if(count >= 2){
            stats['elections'] = stats['elections'] + 1;
        }
        return stats;
    });

    return stats;
}

const getGlobalElectionStats = async (req: IRequest, res: Response, next: NextFunction) => {
    res.json(innerGetGlobalElectionStats(req));
}

export {
    getElections,
    innerGetGlobalElectionStats,
    getGlobalElectionStats,
}