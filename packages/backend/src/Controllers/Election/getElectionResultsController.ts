import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest, Forbidden } from "@curveball/http-errors";
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { VotingMethods } from '../../Tabulators/VotingMethodSelecter';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { ElectionResults, candidate, rawVote } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
import { Candidate } from "@equal-vote/star-vote-shared/domain_model/Candidate";

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

    const ballots = await BallotModel.getBallotsByElectionID(String(electionId), req);
    if (!ballots) {
        const msg = `Ballots not found for Election ${electionId}`;
        Logger.info(req, msg);
        throw new BadRequest(msg);
    }

    let results: ElectionResults[] = []
    for (let race_index = 0; race_index < election.races.length; race_index++) {
        const race = election.races[race_index]
        const useWriteIns = race.enable_write_in && race.write_in_candidates && race.write_in_candidates.length > 0
        const writeInCandidates = useWriteIns && race.write_in_candidates ? race.write_in_candidates : []

        // Build candidate list including approved write-in candidates
        const candidates: candidate[] = race.candidates.map((c: Candidate, i) => ({
            id: c.candidate_id,
            name: c.candidate_name,
            tieBreakOrder: i,
            votesPreferredOver: {},
            winsAgainst: {}
        }))

        Logger.debug(req, `[WriteIn Debug] race=${race.race_id} useWriteIns=${useWriteIns} writeInCandidates=${JSON.stringify(writeInCandidates.map(wc => ({name: wc.candidate_name, approved: wc.approved, aliases: wc.aliases})))}`);

        if (useWriteIns) {
            writeInCandidates.forEach((wc, i) => {
                if (wc.approved) {
                    candidates.push({
                        id: `write_in_${wc.candidate_name}`,
                        name: wc.candidate_name,
                        tieBreakOrder: race.candidates.length + i,
                        votesPreferredOver: {},
                        winsAgainst: {}
                    })
                }
            })
        }
        Logger.debug(req, `[WriteIn Debug] candidates for tabulation: ${JSON.stringify(candidates.map(c => ({id: c.id, name: c.name})))}`);

        const race_id = race.race_id
        const cvr: rawVote[] = []
        const num_winners = race.num_winners
        const voting_method = race.voting_method
        let numUnprocessedWriteIns = 0
        let numExcludedWriteIns = 0

        ballots.forEach((ballot: Ballot) => {
            const vote = ballot.votes.find((vote) => vote.race_id === race_id)
            if (vote) {
                const marks: {[key: string]: number} = {}
                vote.scores.forEach(score => {
                    const isRegularCandidate = race.candidates.some((c: Candidate) => c.candidate_id === score.candidate_id)
                    if (isRegularCandidate) {
                        marks[score.candidate_id] = score.score
                    } else if (race.enable_write_in && score.write_in_name) {
                        const write_in_name = score.write_in_name
                        const writeInCandidate = writeInCandidates.find(wc => wc.aliases.includes(write_in_name))
                        Logger.debug(req, `[WriteIn Debug] ballot write_in_name="${write_in_name}" matched=${!!writeInCandidate} approved=${writeInCandidate?.approved} matchedAliases=${JSON.stringify(writeInCandidate?.aliases)}`);
                        if (!writeInCandidate) {
                            numUnprocessedWriteIns += 1
                            numExcludedWriteIns += 1
                        } else if (writeInCandidate.approved) {
                            const wcId = `write_in_${writeInCandidate.candidate_name}`
                            if (!(wcId in marks)) {
                                marks[wcId] = score.score
                            }
                        } else {
                            numExcludedWriteIns += 1
                        }
                    }
                })
                cvr.push({
                    marks,
                    overvote_rank: vote?.overvote_rank,
                    has_duplicate_rank: vote?.has_duplicate_rank,
                })
            }
        })

        if (!VotingMethods[voting_method]) {
            throw new Error(`Invalid Voting Method: ${voting_method}`)
        }
        const msg = `Tabulating results for ${voting_method} election`
        Logger.info(req, msg);
        const tabulationResult = VotingMethods[voting_method](candidates, cvr, num_winners, election.settings)
        results[race_index] = {
            ...tabulationResult,
            numUnprocessedWriteIns: race.enable_write_in ? numUnprocessedWriteIns : undefined,
            numExcludedWriteIns: race.enable_write_in ? numExcludedWriteIns : undefined,
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
