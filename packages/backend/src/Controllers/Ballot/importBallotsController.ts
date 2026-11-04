import { Response, NextFunction } from 'express';
import { Server } from "socket.io";
import { BadRequest, Conflict, InternalServerError } from "@curveball/http-errors";
import { randomUUID } from "crypto";
import { Ballot, BallotSubmitType } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { ElectionRoll, ElectionRollState } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { DEFAULT_ALLOWED_SUBMIT_TYPES } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { permissions } from "@equal-vote/star-vote-shared/domain_model/permissions";
import { orderedVotesToVotes } from "@equal-vote/star-vote-shared/domain_model/OrderedVoteCodec";
import {
    describeRows,
    getBallotImportMode,
    getDefaultVoterKey,
    ImportBallotsRequest,
    ImportBallotsResponse,
    normalizeVoterKey,
    validateImportBallotsRequest,
} from '@equal-vote/star-vote-shared/domain_model/BallotImport';
import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { IElectionRequest } from "../../IRequest";
import { expectPermission } from "../controllerUtils";
import { innerGetGlobalElectionStats } from "../Election";
import { io } from "../../socketHandler";
import { getErrorMessage } from '../../errorUtils';

const BallotModel = ServiceLocator.ballotsDb();
const ElectionRollModel = ServiceLocator.electionRollDb();

const ADMIN_SUBMIT_TYPE: BallotSubmitType = 'submitted_via_admin';

// Looks up the roll row for each voter in the request, in request order. Every
// problem is reported with the positions of the offending voters so the admin can
// fix the file in one pass.
async function resolveRolls(req: IElectionRequest, body: ImportBallotsRequest): Promise<ElectionRoll[]> {
    const election = req.election;
    const key = body.voter_key ?? getDefaultVoterKey(election.settings);
    const existing = (await ElectionRollModel.getRollsByElectionID(election.election_id, req)) ?? [];
    const byKey = new Map<string, ElectionRoll>();
    for (const roll of existing) {
        const value = key === 'email' ? roll.email : roll.voter_id;
        if (value) byKey.set(normalizeVoterKey(key, value), roll);
    }

    const rolls: ElectionRoll[] = [];
    const notOnRoll: number[] = [];
    const notApproved: number[] = [];
    const alreadyVoted: number[] = [];
    body.voter_ids!.forEach((value, i) => {
        const roll = byKey.get(normalizeVoterKey(key, value));
        if (!roll) { notOnRoll.push(i); return; }
        if (roll.state !== ElectionRollState.approved) { notApproved.push(i); return; }
        if (roll.submitted) { alreadyVoted.push(i); return; }
        rolls.push(roll);
    });
    if (notOnRoll.length > 0) throw new BadRequest(`Not on the voter list: ${describeRows('voter', notOnRoll)}`);
    if (notApproved.length > 0) throw new BadRequest(`Not approved to vote: ${describeRows('voter', notApproved)}`);
    if (alreadyVoted.length > 0) throw new BadRequest(`Already voted: ${describeRows('voter', alreadyVoted)}`);
    return rolls;
}

// POST /Election/:id/importBallots — see BallotImport.ts (shared) for the two contexts.
// Everything is validated up front and then written in one transaction, so the
// response is either the counts or an error with nothing written.
async function importBallotsController(req: IElectionRequest, res: Response, _next: NextFunction) {
    Logger.info(req, "Import Ballots Controller");

    expectPermission(req.user_auth.roles, permissions.canUploadBallots);

    const election = req.election;
    if (election == null) {
        throw new BadRequest("Invalid election Id");
    }
    if (election.state !== 'open') {
        throw new BadRequest(`Ballots can only be imported while the election is open (state is '${election.state}')`);
    }
    const allowedTypes = election.settings.allowed_submit_types ?? DEFAULT_ALLOWED_SUBMIT_TYPES;
    if (!allowedTypes.includes(ADMIN_SUBMIT_TYPE)) {
        throw new BadRequest("Paper ballot uploads are not enabled for this election");
    }
    const mode = getBallotImportMode(election.settings);
    // An imported voter has no linked ballot, so the "update your ballot" flow would hand
    // them a second one. Refuse rather than silently double count.
    if (mode === 'roll' && election.settings.ballot_updates) {
        throw new BadRequest("Ballots cannot be imported into an election that lets voters update their ballot");
    }

    const body = req.body as ImportBallotsRequest;
    const validationError = validateImportBallotsRequest(election, body);
    if (validationError) {
        Logger.info(req, `Import rejected: ${validationError}`);
        throw new BadRequest(validationError);
    }

    const ballotIds = body.ballots.map(b => b.ballot_id.trim());
    const existingIds = new Set(await BallotModel.getExistingBallotIDs(election.election_id, ballotIds, req));
    if (existingIds.size > 0) {
        const rows = ballotIds.map((id, i) => existingIds.has(id) ? i : -1).filter(i => i >= 0);
        throw new BadRequest(`Already in this election: ${describeRows('ballot', rows)} (${[...existingIds].slice(0, 5).join(', ')})`);
    }

    const rolls = mode === 'roll' ? await resolveRolls(req, body) : [];

    const now = Date.now();
    const actor = req.user?.username ?? req.user?.email ?? '';
    const ballots: Ballot[] = body.ballots.map((row, i) => ({
        ballot_id: ballotIds[i],
        election_id: election.election_id,
        status: 'submitted',
        date_submitted: now,
        precinct: row.precinct || undefined,
        votes: orderedVotesToVotes(row.orderedVotes, body.race_order),
        history: [{ action_type: ADMIN_SUBMIT_TYPE, actor, timestamp: now }],
        // generated by the store on insert
        create_date: '',
        update_date: '',
        head: true,
    }));
    for (const roll of rolls) {
        roll.history = [...(roll.history ?? []), { action_type: 'submit', actor, timestamp: now }];
    }

    try {
        await ServiceLocator.castVoteStore().importBallots(
            { requestId: req.contextId ?? randomUUID(), ballots, rolls },
            Logger.createContext(req.contextId ?? randomUUID()),
        );
    } catch (e: unknown) {
        const message = getErrorMessage(e);
        if (message === "ALREADY_VOTED" || message === "CONCURRENT_ROLL_EDIT_DETECTED") {
            Logger.info(req, `Import rejected: ${message}`);
            throw new Conflict("A voter on the list changed while the import was running (they may have just voted online). Nothing was imported, please retry.");
        }
        Logger.error(req, `Could not import ballots: ${message}`);
        throw new InternalServerError("Could not import ballots");
    }

    if (io != null) { // necessary for tests
        (io as Server).to('landing_page').emit('updated_stats', await innerGetGlobalElectionStats(req));
    }

    const response: ImportBallotsResponse = { imported: ballots.length, voters_marked: rolls.length };
    res.status(200).json(response);
    Logger.debug(req, `Import Ballots Controller done: ${ballots.length} ballots, ${rolls.length} voters marked`);
}

export {
    importBallotsController,
}
