import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { Unauthorized } from "@curveball/http-errors";
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { AnonymizedBallot, Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';


const BallotModel = ServiceLocator.ballotsDb();

// Serialize ballots into `{"ballots":[...]}` incrementally, batching rows into
// ~64KB chunks so we don't emit one tiny HTTP chunk per ballot.
async function* anonymizedBallotJsonChunks(ballots: AsyncIterable<Ballot>): AsyncIterable<string> {
    const FLUSH_CHARS = 64 * 1024;
    let buffer = '{"ballots":[';
    let first = true;
    for await (const ballot of ballots) {
        const anonymizedBallot: AnonymizedBallot = {
            ballot_id: ballot.ballot_id,
            election_id: ballot.election_id,
            precinct: ballot.precinct ?? null, // JSON.stringify would drop the key entirely if undefined
            votes: ballot.votes,
        };
        buffer += (first ? '' : ',') + JSON.stringify(anonymizedBallot);
        first = false;
        if (buffer.length >= FLUSH_CHARS) {
            yield buffer;
            buffer = '';
        }
    }
    yield buffer + ']}';
}

export const getAnonymizedBallotsByElectionID = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    var electionId = req.election.election_id;
    Logger.debug(req, "getAnonymizedBallotsByElectionID: " + electionId);
    const election = req.election;
    if (!election.settings.public_results) {
        if (election.state !== 'closed') {
            const msg = `Ballot access only permited when public results are enabled or election has closed`;
            Logger.info(req, msg);
            throw new Unauthorized(msg)
        }
        expectPermission(req.user_auth.roles, permissions.canViewBallots)
    }

    // Stream ballots from a db cursor straight to the response so the full
    // payload is never held in memory (large elections were OOMing the pod).
    // The query returns ballots in random order so the response can't reveal
    // ballot submission order — see getBallotsByElectionIDController for the
    // threat model.
    const ballots = BallotModel.streamSubmittedBallotsByElectionID(String(electionId), req);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
        // pipeline propagates backpressure (a slow client throttles the cursor)
        // and tears down the cursor if the client disconnects mid-stream.
        await pipeline(Readable.from(anonymizedBallotJsonChunks(ballots)), res);
    } catch (err: any) {
        if (err?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
            Logger.info(req, `getAnonymizedBallotsByElectionID: client disconnected mid-stream`);
            return;
        }
        // The 200 status and part of the body may already be sent, so surface
        // the failure by aborting the connection rather than sending a status —
        // pipeline has already destroyed the response stream.
        Logger.error(req, `getAnonymizedBallotsByElectionID: stream failed: ${err}`);
    }
}
