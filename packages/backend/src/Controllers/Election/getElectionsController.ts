import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest, IRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { Election, removeHiddenFields } from '@equal-vote/star-vote-shared/domain_model/Election';
import { expectPermission } from '../controllerUtils';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';


var ElectionsModel = ServiceLocator.electionsDb();
var ElectionRollModel = ServiceLocator.electionRollDb();

// TODO: We should probably split this up as the user will only need one of these filters
const getElections = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `getElections`);
    // var filter = (req.query.filter == undefined) ? "" : req.query.filter;
    const email = req.user?.email || ''
    const id = req.user?.sub || ''

    /////////// ELECTIONS WE OWN ////////////////
    var elections_as_official = null;
    if((email !== '' || id !== '') && req.user.typ != 'TEMP_ID'){ 
        elections_as_official = await ElectionsModel.getElections(id, email, req);
        if (!elections_as_official) {
            var msg = "Election does not exist";
            Logger.info(req, msg);
            throw new BadRequest(msg);
        }
        elections_as_official.forEach((elec: Election) => removeHiddenFields(elec))
    }

    /////////// ELECTIONS WE'RE INVITED TO ////////////////
    var elections_as_unsubmitted_voter = null;
    if (email !== '') {
        // NOTE: This could be very large if the user had uploaded prior elections. In that case the user would have a roll entry for every vote uploaded
        let myRolls = await ElectionRollModel.getByEmailAndUnsubmitted(email, req)
        let election_ids = myRolls?.map(election => election.election_id) ?? [];
        election_ids = election_ids.filter((eid, i) => election_ids.indexOf(eid) == i); // filter unique

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
        let election_ids = myRolls?.map(election => election.election_id) ?? [];
        election_ids = election_ids.filter((eid, i) => election_ids.indexOf(eid) == i); // filter unique
        if (election_ids && election_ids.length > 0) {
            elections_as_submitted_voter = await ElectionsModel.getElectionByIDs(election_ids,req)
        }
    }

    res.json({
        elections_as_official,
        elections_as_unsubmitted_voter,
        elections_as_submitted_voter,
        public_archive_elections: await ElectionsModel.getPublicArchiveElections(req),
        open_elections: await ElectionsModel.getOpenElections(req)
    });
}

const queryElections = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `queryElections`);

    // TODO: https://github.com/Equal-Vote/bettervoting/issues/976
    //expectPermission(req.user_auth.roles, permissions.canQueryElections);

    /////////// ELECTIONS WE OWN ////////////////
    res.json({
        open_elections: await ElectionsModel.getElectionsCreatedInRange(req, req.body.start_time, req.body.end_time),
        closed_elections: [],
        popular_elections: [],
        vote_counts: await ElectionsModel.getBallotCountsForAllElections(req),
    });
}

const VOTING_METHOD_KEYS: Record<string, string> = {
    'STAR': 'star',
    'IRV': 'rcv',
    'Approval': 'approval',
    'RankedRobin': 'ranked_robin',
    'STAR_PR': 'star_pr',
    'Plurality': 'plurality',
    'STV': 'stv',
};

const ALL_METHOD_KEYS = ['star', 'rcv', 'approval', 'ranked_robin', 'star_pr', 'plurality', 'stv', 'multi_method'];

const innerGetGlobalElectionStats = async (req: IRequest) => {
    Logger.info(req, `getGlobalElectionStats `);

    const [electionVotes, electionRaces, sourcedFromPrior] = await Promise.all([
        ElectionsModel.getBallotCountsForAllElections(req),
        ElectionsModel.getElectionRacesForAllElections(req),
        ElectionsModel.getElectionsSourcedFromPrior(req),
    ]);

    const priorElections = sourcedFromPrior?.map(e => e.election_id) ?? [];

    // Build election_id -> method_key map; elections with multiple distinct methods are 'multi_method'
    const electionMethodMap: Record<string, string> = {};
    electionRaces?.forEach(e => {
        const methods = new Set((e.races as any[]).map(r => r.voting_method));
        const methodKey = methods.size > 1
            ? 'multi_method'
            : (VOTING_METHOD_KEYS[[...methods][0] as string] ?? 'other');
        electionMethodMap[e.election_id] = methodKey;
    });

    const legacyVotes = Number(process.env.CLASSIC_VOTE_COUNT ?? 0);
    const legacyElections = Number(process.env.CLASSIC_ELECTION_COUNT ?? 0);

    // legacy_* holds pre-existing counts from classic star.vote; the per-method breakdowns
    // cover only current elections, so: votes = legacy_votes + sum(method_votes),
    // and: elections = legacy_elections + sum(method_elections)
    const stats: Record<string, number> = {
        elections: legacyElections,
        votes: legacyVotes,
        legacy_elections: legacyElections,
        legacy_votes: legacyVotes,
    };

    for (const key of ALL_METHOD_KEYS) {
        stats[`${key}_elections`] = 0;
        stats[`${key}_votes`] = 0;
    }

    electionVotes
        ?.filter(m => !priorElections.includes(m['election_id']))
        ?.forEach((m) => {
            const count = Number(m['v']);
            stats['votes'] += count;
            if (count >= 2) stats['elections'] += 1;

            const methodKey = electionMethodMap[m['election_id']] ?? 'other';
            if (stats[`${methodKey}_votes`] !== undefined) {
                stats[`${methodKey}_votes`] += count;
                if (count >= 2) stats[`${methodKey}_elections`] += 1;
            }
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
    queryElections,
}