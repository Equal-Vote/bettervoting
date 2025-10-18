import { Election } from "@equal-vote/star-vote-shared/domain_model/Election";
import { ElectionRoll } from "@equal-vote/star-vote-shared/domain_model/ElectionRoll";
import { Ballot, ballotValidation, NewBallot, OrderedNewBallot, RaceCandidateOrder } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest, InternalServerError, Unauthorized } from "@curveball/http-errors";
import { ILoggingContext } from "../../Services/Logging/ILogger";
import { randomUUID } from "crypto";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { Receipt } from "../../Services/Email/EmailTemplates"
import { getOrCreateElectionRoll, checkForMissingAuthenticationData, getVoterAuthorization } from "../Roll/voterRollUtils"
import { innerGetGlobalElectionStats } from "../Election";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { io } from "../../socketHandler";
import { Server } from "socket.io";
import { expectPermission } from "../controllerUtils";
import { permissions } from "@equal-vote/star-vote-shared/domain_model/permissions";
import { OrderedVote } from "@equal-vote/star-vote-shared/domain_model/Vote";
import { Score } from "@equal-vote/star-vote-shared/domain_model/Score";
import { makeUniqueID, ID_LENGTHS, ID_PREFIXES } from "@equal-vote/star-vote-shared/utils/makeID";

const ElectionsModel = ServiceLocator.electionsDb();
const ElectionRollModel = ServiceLocator.electionRollDb();
const BallotModel = ServiceLocator.ballotsDb();
const EventQueue = ServiceLocator.eventQueue();
const EmailService = ServiceLocator.emailService();

type CastVoteEvent = {
    requestId:Uid,
    inputBallot:Ballot,
    roll?:ElectionRoll,
    userEmail?:string,
    isBallotUpdate: boolean,
}

// NOTE: discord isn't implemented yet, but that's the plan for the future
type BallotSubmitType = 'submitted_via_browser' | 'submitted_via_admin' | 'submitted_via_discord';

const castVoteEventQueue = "castVoteEvent";

async function makeBallotEvent(req: IElectionRequest, targetElection: Election, inputBallot: NewBallot, submitType: BallotSubmitType, voter_id?: string){
    inputBallot.election_id = targetElection.election_id;
    let roll = null;
    // skip voter roll & validation steps while in draft mode
    // TODO: we may be able to shortcut further for elections that don't require authentication
    //       ^ that could be huge when creating elections from a set of ballots
    if(targetElection.state !== 'draft' && req.election.ballot_source !== 'prior_election') {
        const missingAuthData = checkForMissingAuthenticationData(req, targetElection, req, voter_id)
        if (missingAuthData !== null) {
            throw new Unauthorized(missingAuthData);
        }

        // skipping state check since this is allowed when uploading ballots, and it's already explicitly checked for individual ballots
        roll = await getOrCreateElectionRoll(req, targetElection, req, voter_id, true);
        const voterAuthorization = getVoterAuthorization(roll,missingAuthData)

        assertVoterMayVote(voterAuthorization, targetElection, req);

        //TODO: currently we have both a value on the input Ballot, and the route param.
        //do we want to keep both?  enforce that they match?
        if (roll) {
            inputBallot.precinct = roll.precinct
        }
        const validationErr = ballotValidation(targetElection, inputBallot);
        if (validationErr){
            const errMsg = "Invalid Ballot: "+ validationErr
            Logger.info(req, errMsg);
            throw new BadRequest(errMsg);
        }
    }

    //some ballot info should be server-authorative
    // TODO: move to db trigger
    inputBallot.date_submitted = Date.now();
    if (inputBallot.history == null){
        inputBallot.history = [];
    }
    // preserve the ballot id if it's already provided from prior election
    let updatableBallot;
    if (targetElection.settings.ballot_updates) {
        updatableBallot = await BallotModel.getBallotByVoterID(roll!.voter_id, inputBallot.election_id, req);
    }
    if (updatableBallot) {
        inputBallot.ballot_id = updatableBallot.ballot_id;
    } else if(!inputBallot.ballot_id || targetElection.ballot_source != 'prior_election') {
        inputBallot.ballot_id = await makeUniqueID(
            ID_PREFIXES.BALLOT,
            ID_LENGTHS.BALLOT,
            async (id: string) => await BallotModel.getBallotByID(id, req) !== null
        );
    }
    //TODO, ensure the user ID is added to the ballot...
    //should server-authenticate the user id based on auth token
    inputBallot.history.push({
        action_type: submitType,
        actor: roll===null ? '' : roll.voter_id ,
        timestamp:inputBallot.date_submitted,
    });

    if (roll != null){
        roll.ballot_id = String(inputBallot.ballot_id);
        roll.submitted = true;
        if (roll.history == null){
            roll.history = [];
        }
        roll.history.push({
            action_type: updatableBallot ? "update": "submit",
            actor: roll===null ? '' : roll.voter_id ,
            timestamp:inputBallot.date_submitted,
        });
    }


    if(req.election.ballot_source !== 'prior_election') Logger.debug(req, "Submit Ballot:", inputBallot);

    return {
        requestId:req.contextId ? req.contextId : randomUUID(),
        inputBallot,
        roll,
        userEmail:undefined,
        isBallotUpdate: !!updatableBallot,
    }
}

const mapOrderedNewBallot = (ballot: OrderedNewBallot, raceOrder: RaceCandidateOrder[]): NewBallot => {
    let subBallot: any = {...ballot};
    delete subBallot.orderedVotes;
    if(ballot.orderedVotes.length != raceOrder.length){
        throw new BadRequest(`Ballot contains different number of races than race_order: ${ballot.orderedVotes.length} != ${raceOrder.length}`)
    }
    return {
        ...subBallot,
        votes: ballot.orderedVotes.map((vote: OrderedVote, i) => {
            // +2 accounts for overvote_rank and has_duplicate_rank
            if(vote.length != raceOrder[i].candidate_id_order.length+2){
                throw new BadRequest(`Race ${i} contains different number of candidates than race_order: ${vote.length} != ${raceOrder[i].candidate_id_order.length+2}`)
            }
            return {
                race_id: raceOrder[i].race_id,
                scores: vote.slice(0, -2).map((s, j) => ({
                    candidate_id: raceOrder[i].candidate_id_order[j],
                    score: s
                } as Score)),
                overvote_rank: vote.at(-2),
                has_duplicate_rank: vote.at(-1) == 1,
            }
        })
    }
}
async function uploadBallotsController(req: IElectionRequest, res: Response, next: NextFunction) {
    Logger.info(req, "Upload Ballots Controller");

    expectPermission(req.user_auth.roles, permissions.canUploadBallots);

    //TODO: if it's a public_archive item, also check canUpdatePublicArchive instead

    const targetElection = req.election;
    if (targetElection == null){
        const errMsg = "Invalid Ballot: invalid election Id";
        Logger.info(req, errMsg);
        throw new BadRequest(errMsg);
    }
 
    let events = await Promise.all(
        req.body.ballots.map(({ballot, voter_id} : {ballot: OrderedNewBallot, voter_id: string}) => 
            makeBallotEvent(
                req,
                targetElection,
                structuredClone(
                    mapOrderedNewBallot(ballot, req.body.race_order as RaceCandidateOrder[])
                ),
                'submitted_via_admin',
                voter_id
            ).catch((err) => ({
                error: err,
                ballot: ballot
            }))
        )
    );

    let output = events.map((event, i) => ({
        voter_id: req.body.ballots[i].voter_id,
        success: !('error' in event),
        message: ('error' in event)? event.error : 'Success'
    }))

    try {
        // if it's a prior election bypass the queue system
        // we're less concerned about race conditions for a prior election
        if(targetElection.ballot_source == 'prior_election'){
            // we only need to submit the ballot
            // we don't need to update the roll since all the voter_auth fields are set to false
            await BallotModel.bulkSubmitBallots(
                events.filter(event => !('error' in event)).map(event => event.inputBallot),
                req,
                `Admin submits a ballot for prior election`
            )
        }else{
            await (await EventQueue).publishBatch(castVoteEventQueue, events.filter(event => !('error' in event)));
        }
    }catch(err: any){
        const msg = `Could not upload ballots`;
        Logger.error(req, `${msg}: ${err.message}`);
        throw new InternalServerError(msg)
    }

    if(io != null){ // necessary for tests
        (io as Server).to('landing_page').emit('updated_stats', await innerGetGlobalElectionStats(req));
    }

    res.status(200).json({ responses: output} );
    Logger.debug(req, "CastVoteController done, saved event to store");
};

async function castVoteController(req: IElectionRequest, res: Response, next: NextFunction) {
    Logger.info(req, "Cast Vote Controller");

    const targetElection = req.election;
    if (targetElection == null){
        const errMsg = "Invalid Ballot: invalid election Id";
        Logger.info(req, errMsg);
        throw new BadRequest(errMsg);
    }
 
    if ((targetElection.state!=='open' && targetElection.state!=='draft')){
        Logger.info(req, "Ballot Rejected. Election not open.", targetElection);
        throw new BadRequest("Election is not open");
    }

    let event = await makeBallotEvent(req, targetElection, req.body.ballot, 'submitted_via_browser')

    event.userEmail = req.body.receiptEmail;

    await (await EventQueue).publish(castVoteEventQueue, event);

    if(io != null){ // necessary for tests
        (io as Server).to('landing_page').emit('updated_stats', await innerGetGlobalElectionStats(req));
    }

    // Scrub ballot_id to prevent voters from creating receipts (vote buying/coercion)
    const scrubbedBallot = {
        ...event.inputBallot,
        ballot_id: undefined
    };

    res.status(200).json({ ballot: scrubbedBallot} );
    Logger.debug(req, "CastVoteController done, saved event to store");
};


async function handleCastVoteEvent(job: { id: string; data: CastVoteEvent; }):Promise<void> {
    const event = job.data;
    const ctx = Logger.createContext(event.requestId);
    let savedBallot;
    if (event.isBallotUpdate) {
        savedBallot = await BallotModel.updateBallot(event.inputBallot, ctx, `User updates a ballot`);
    } else {
        savedBallot = await BallotModel.getBallotByID(event.inputBallot.ballot_id, ctx);
        if (!savedBallot){
            savedBallot = await BallotModel.submitBallot(event.inputBallot, ctx, `User submits a ballot`);
        }
    }

    if (event.roll != null) {
        await ElectionRollModel.update(event.roll, ctx, `User submits a ballot`);
    }

    if (event.userEmail){
        const targetElection = await ElectionsModel.getElectionByID(event.inputBallot.election_id, ctx);
        if (targetElection == null){
            throw new InternalServerError("Target Election null: " + ctx.contextId);
        }
        const url = ServiceLocator.globalData().mainUrl;
        const receipt = Receipt(targetElection, event.userEmail, savedBallot, url)
        await EmailService.sendEmails([receipt])
    }
}

function assertVoterMayVote(voterAuthorization:any, election: Election, ctx:ILoggingContext ): void{
    Logger.debug(ctx, "assert voter may vote");
    if (voterAuthorization.authorized_voter === false){
        throw new Unauthorized("User not authorized to vote");
    }
    if (voterAuthorization.has_voted === true && !(election.settings.ballot_updates === true)){
        throw new BadRequest("User has already voted");
    }
    Logger.debug(ctx, "Voter authorized");
}

export {
    castVoteController,
    uploadBallotsController,
    handleCastVoteEvent
}
