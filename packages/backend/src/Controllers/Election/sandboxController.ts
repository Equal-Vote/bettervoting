import { ElectionResults } from '@equal-vote/star-vote-shared/domain_model/ITabulators';
import Logger from '../../Services/Logging/Logger';
const className = "Elections.Controllers";
import { VotingMethods } from '../../Tabulators/VotingMethodSelecter'
import { Request, Response, NextFunction } from 'express';
import { STV } from '../../Tabulators/IRV';
import { VotingMethod } from '@equal-vote/star-vote-shared/domain_model/Race';

const getSandboxResults = async (req: Request, res: Response, next: NextFunction) => {
    Logger.info(req, `${className}.getSandboxResults`);

    const candidateNames = req.body.candidates;
    let cvr = req.body.cvr;
    const num_winners = req.body.num_winners;
    const voting_method = req.body.votingMethod as VotingMethod;

    if (!(voting_method in VotingMethods)) {
        throw new Error('Invalid Voting Method')
    }

    const candidates = candidateNames.map((name: string, i: number) => ({
        id: name,
        name: name,
        // These will be set later
        tieBreakOrder: i,
        votesPreferredOver: {},
        winsAgainst: {}
    }))

    cvr = cvr.map((row: number[]) => ({
        marks: Object.fromEntries(row.map((score: number, i: number) => [candidateNames[i], score])),
        // TODO: we could support this in the future
        overvote_rank: null,
        has_duplicate_rank: null,
    }))

    let results: ElectionResults = VotingMethods[voting_method](candidates, cvr, num_winners);

    res.json(
        {
            results: results,
            nWinners: num_winners,
            candidates: candidateNames,
        }
    );
}

export {
    getSandboxResults
}