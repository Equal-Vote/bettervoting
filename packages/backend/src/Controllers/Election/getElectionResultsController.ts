import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { Forbidden } from "@curveball/http-errors";
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { VotingMethods } from '../../Tabulators/VotingMethodSelecter';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { ElectionResults, rawVote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { projectBallots } from "../../Tabulators/BallotProjection";
import shuffleCandidatesForRandomTiebreak from "../../Tabulators/shuffleCandidatesForRandomTiebreak";

const BallotModel = ServiceLocator.ballotsDb();

const getElectionResults = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    const election = req.election
    const electionId = election.election_id;

    Logger.info(req, `getElectionResults: ${electionId}`);

    if (!election.settings.public_results) {
        if (election.state == 'open') {
            const msg = `Preliminary results not enabled for election ${electionId}`;
            Logger.error(req, msg);
            throw new Forbidden(msg);
        }
        expectPermission(req.user_auth.roles, permissions.canViewPreliminaryResults)
    }

    // Stream ballots from a db cursor and project each one into the compact
    // per-race representation, so the verbose rows are never all in memory at
    // once (see Tabulators/BallotProjection).
    const projections = await projectBallots(
        election.races,
        BallotModel.streamVotesByElectionID(String(electionId), req),
        {
            debug: (msg) => Logger.debug(req, msg),
            warn: (msg) => Logger.warn(req, msg),
        }
    )

    let results: ElectionResults[] = []
    for (let race_index = 0; race_index < election.races.length; race_index++) {
        const race = election.races[race_index]
        const projection = projections[race_index]
        const candidates = projection.candidates
        const numUnprocessedWriteIns = projection.numUnprocessedWriteIns
        const numExcludedWriteIns = projection.numExcludedWriteIns

        Logger.debug(req, `[WriteIn Debug] race=${race.race_id} useWriteIns=${projection.useWriteIns} writeInCandidates=${JSON.stringify(projection.writeInCandidates.map(wc => ({name: wc.candidate_name, approved: wc.approved, aliases: wc.aliases})))}`);
        Logger.debug(req, `[WriteIn Debug] candidates for tabulation: ${JSON.stringify(candidates.map(c => ({id: c.id, name: c.name})))}`);

        const num_winners = race.num_winners
        const voting_method = race.voting_method

        if (candidates.length < 1) {
            projection.release()
            results[race_index] = {
                votingMethod: voting_method,
                elected: [],
                tied: [],
                other: [],
                roundResults: [],
                summaryData: {
                    candidates,
                    nOutOfBoundsVotes: 0,
                    nAbstentions: 0,
                    nTallyVotes: 0,
                    nOvervotes: 0,
                },
                tieBreakType: 'none',
                perm: [],
                writeInDiagnostics: race.enable_write_in ? {
                    numScoresDisregardedForUnprocessed: numUnprocessedWriteIns,
                    numScoresDisregarded: numExcludedWriteIns,
                } : undefined,
            } as unknown as ElectionResults; // ElectionResults is a discriminated union requiring method-specific candidate fields; not worth constructing for this degenerate case
            continue;
        }

        if (!VotingMethods[voting_method]) {
            throw new Error(`Invalid Voting Method: ${voting_method}`)
        }

        // Expand the compact store into the tabulator's input only now, and only
        // for this race, so at most one race's verbose cvr is alive at a time.
        const cvr: rawVote[] = projection.takeRawVotes()

        shuffleCandidatesForRandomTiebreak(election.create_date, candidates, cvr.length, race.race_id);
        const perm = candidates.map(candidate => candidate.id);

        const msg = `Tabulating results for ${voting_method} election`
        Logger.info(req, msg);
        const tabulationResult = VotingMethods[voting_method](candidates, cvr, num_winners, election.settings)
        results[race_index] = {
            ...tabulationResult,
            perm,
            // @ts-ignore - roundResults is a complicated type but we're just returning a slightly modified version of the original so the type should be consistent
            roundResults: tabulationResult.roundResults.map(rr => ({
                ...rr,
                logs: rr.logs.map(log => {
                    // A hacky approach that I'm still pretty confident in it
                    if(typeof log === 'object' && log.key.includes('random')) return {
                        ...log,
                        tiebreak_candidate_names: candidates.map(c => c.name).join(', '),
                    }
                    return log
                }),
            })),
            writeInDiagnostics: race.enable_write_in ? {
                numScoresDisregardedForUnprocessed: numUnprocessedWriteIns,
                numScoresDisregarded: numExcludedWriteIns,
            } : undefined,
        };
    }
    
    res.json(
        {
            election: election,
            results: results
        }
    )
}

export {
    getElectionResults
}
