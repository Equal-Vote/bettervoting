import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest, IRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { Election, removeHiddenFields } from '@equal-vote/star-vote-shared/domain_model/Election';
import { Race, VotingMethod, MethodTextKey, methodValueToTextKey } from '@equal-vote/star-vote-shared/domain_model/Race';
import { expectPermission } from '../controllerUtils';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { sharedConfig } from '@equal-vote/star-vote-shared/config';


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

type ElectionMethodKey = MethodTextKey | 'multi_method';

const ALL_METHOD_KEYS: ElectionMethodKey[] = [
    ...(Object.values(methodValueToTextKey) as MethodTextKey[]),
    'multi_method',
];

type YearStats =
    { elections: number; votes: number } &
    Record<`${ElectionMethodKey}_votes`, number> &
    Record<`${ElectionMethodKey}_elections`, number>;

type GlobalElectionStats =
    { elections: number; votes: number; legacy_elections: number; legacy_votes: number; by_year: Record<string, YearStats> } &
    Record<`${ElectionMethodKey}_votes`, number> &
    Record<`${ElectionMethodKey}_elections`, number>;

type ElectionWithRaces = Pick<Election, 'election_id' | 'owner_id' | 'races' | 'create_date'>;
type VoteCountData = { election_id: string; v: number };

type ElectionMetadata = {
    methodByElection: Record<string, ElectionMethodKey>;
    yearByElection: Record<string, number>;
    devElectionIds: Set<string>;
};

const emptyYearStats = (): YearStats => ({
    elections: 0,
    votes: 0,
    ...Object.fromEntries(ALL_METHOD_KEYS.flatMap(k => [[`${k}_votes`, 0], [`${k}_elections`, 0]])),
} as YearStats);

// Indexes elections by id so the aggregate and per-year passes can share a single
// derivation of method-key and creation year. Elections owned by dev users are
// tracked so their votes can be filtered out; elections with no races or an
// unknown voting method are simply omitted from methodByElection.
const buildElectionMetadata = (elections: ElectionWithRaces[] | null): ElectionMetadata => {
    const methodByElection: Record<string, ElectionMethodKey> = {};
    const yearByElection: Record<string, number> = {};
    const devElectionIds = new Set<string>();

    (elections ?? []).forEach(e => {
        if (sharedConfig.DEV_USERS.includes(e.owner_id) && !sharedConfig.REAL_ELECTIONS_FROM_DEVS.includes(e.election_id)) {
            devElectionIds.add(e.election_id);
            return;
        }
        const methods = new Set((e.races as Race[]).map(r => r.voting_method));
        if (methods.size === 0) return; // drafted elections with no races yet
        let methodKey: ElectionMethodKey;
        if (methods.size > 1) {
            methodKey = 'multi_method';
        } else {
            // some legacy garbage elections have invalid voting methods (e.g. "STAR VOting"); skip them
            const key = methodValueToTextKey[[...methods][0] as VotingMethod];
            if (!key) return;
            methodKey = key;
        }
        methodByElection[e.election_id] = methodKey;

        if (e.create_date) {
            const year = new Date(e.create_date).getUTCFullYear();
            if (!isNaN(year)) yearByElection[e.election_id] = year;
        }
    });

    return { methodByElection, yearByElection, devElectionIds };
};

const filterQualifyingVotes = (
    electionVotes: VoteCountData[] | null,
    meta: ElectionMetadata,
    priorElectionIds: Set<string>,
): VoteCountData[] =>
    (electionVotes ?? []).filter(m =>
        !meta.devElectionIds.has(m.election_id) &&
        !priorElectionIds.has(m.election_id) &&
        Number(m.v) >= 2 &&
        meta.methodByElection[m.election_id] !== undefined,
    );

/**
 * Pure function that buckets qualifying elections by calendar year.
 * Exported for independent unit testing — takes already-fetched data and
 * returns the by_year object without touching the database.
 */
const computeByYear = (
    elections: ElectionWithRaces[] | null,
    electionVotes: VoteCountData[] | null,
    priorElectionIds: string[],
    currentYear: number
): Record<string, YearStats> => {
    const meta = buildElectionMetadata(elections);
    const qualifying = filterQualifyingVotes(electionVotes, meta, new Set(priorElectionIds));

    const years = qualifying
        .map(m => meta.yearByElection[m.election_id])
        .filter((y): y is number => y !== undefined);
    if (years.length === 0) return {};

    const byYear: Record<string, YearStats> = {};
    for (let y = Math.min(...years); y <= currentYear; y++) {
        byYear[String(y)] = emptyYearStats();
    }

    qualifying.forEach(m => {
        const year = meta.yearByElection[m.election_id];
        if (year === undefined) return;
        const bucket = byYear[String(year)];
        if (!bucket) return;
        const methodKey = meta.methodByElection[m.election_id];
        const votes = Number(m.v);
        bucket.elections += 1;
        bucket.votes += votes;
        bucket[`${methodKey}_elections`] += 1;
        bucket[`${methodKey}_votes`] += votes;
    });

    return byYear;
};

const innerGetGlobalElectionStats = async (req: IRequest): Promise<GlobalElectionStats> => {
    Logger.info(req, `getGlobalElectionStats `);

    const [electionVotes, elections, sourcedFromPrior] = await Promise.all([
        ElectionsModel.getBallotCountsForAllElections(req),
        ElectionsModel.getElectionsWithRacesForAllElections(req),
        ElectionsModel.getElectionsSourcedFromPrior(req),
    ]);

    const priorElections = sourcedFromPrior?.map(e => e.election_id) ?? [];
    const meta = buildElectionMetadata(elections);

    const legacyVotes = Number(process.env.CLASSIC_VOTE_COUNT ?? 0);
    const legacyElections = Number(process.env.CLASSIC_ELECTION_COUNT ?? 0);

    // legacy_* holds pre-existing counts from classic star.vote; the per-method breakdowns
    // cover only current elections, so: votes = legacy_votes + sum(method_votes),
    // and: elections = legacy_elections + sum(method_elections)
    const stats = {
        elections: legacyElections,
        votes: legacyVotes,
        legacy_elections: legacyElections,
        legacy_votes: legacyVotes,
        by_year: {},
        ...Object.fromEntries(ALL_METHOD_KEYS.flatMap(k => [[`${k}_votes`, 0], [`${k}_elections`, 0]])),
    } as GlobalElectionStats;

    filterQualifyingVotes(electionVotes, meta, new Set(priorElections))
        .forEach(m => {
            const methodKey = meta.methodByElection[m.election_id];
            const votes = Number(m.v);
            stats.elections += 1;
            stats.votes += votes;
            stats[`${methodKey}_elections`] += 1;
            stats[`${methodKey}_votes`] += votes;
        });

    stats.by_year = computeByYear(elections, electionVotes, priorElections, new Date().getUTCFullYear());

    return stats;
}

const getGlobalElectionStats = async (req: IRequest, res: Response, next: NextFunction) => {
    res.json(await innerGetGlobalElectionStats(req));
}

export {
    getElections,
    innerGetGlobalElectionStats,
    getGlobalElectionStats,
    queryElections,
    computeByYear,
}
