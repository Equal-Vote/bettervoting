import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest } from "@curveball/http-errors";
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { Ballot } from "@equal-vote/star-vote-shared/domain_model/Ballot";
import { WriteInData } from "@equal-vote/star-vote-shared/domain_model/WriteIn";

var BallotModel = ServiceLocator.ballotsDb();

const getWriteInNamesController = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    var electionId = req.election.election_id;
    Logger.debug(req, "getBallotsByElectionID: " + electionId);

    expectPermission(req.user_auth.roles, permissions.canViewBallots)

    const ballots = await BallotModel.getBallotsByElectionID(String(electionId), req);
    if (!ballots) {
        const msg = `Ballots not found for Election ${electionId}`;
        Logger.info(req, msg);
        throw new BadRequest(msg)
    }

    const election = req.election
    const write_in_data: WriteInData[] = []
    // Loop through races and gather write in data
    for (let race_index = 0; race_index < election.races.length; race_index++) {
        if (!election.races[race_index].enable_write_in) {
            // Write ins not enabled for this race
            continue
        }
        const race_id = election.races[race_index].race_id


        // Write in data is stored as key-value pairs in the names object in the write in data
        // Example: 'Candidate A' was a write in 10 timees and 'Candidate B' waas a write in 123 times
        // const write_in_result: WriteInData = {
        //     race_id: '1234',
        //     names: {
        //         'Candidate A': 10,
        //         'Candidate B': 123,
        //     }
        // }
        const write_in_result: WriteInData = { race_id: race_id, names: {} }

        ballots.forEach((ballot: Ballot) => {
            //For each ballot, find vote for current race
            const vote = ballot.votes.find((vote) => vote.race_id === race_id)
            if (vote) {
                // Loop through scores and look for 
                vote.scores.forEach(score => {
                    if (score.write_in_name) {
                        // If name is already a property, increment value by one. Otherwise set to 1
                        write_in_result.names[score.write_in_name] = write_in_result.names[score.write_in_name] ? write_in_result.names[score.write_in_name] + 1 : 1
                    }
                })
            }
        })
        write_in_data.push(write_in_result)
    }

    res.json({ write_in_data: write_in_data })
}

export {
    getWriteInNamesController
}