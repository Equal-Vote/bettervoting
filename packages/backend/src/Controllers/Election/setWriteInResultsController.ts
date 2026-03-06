import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { WriteInCandidate } from '@equal-vote/star-vote-shared/domain_model/WriteIn';

var ElectionsModel = ServiceLocator.electionsDb();

const trimLower = (s: string) => s.trim().toLowerCase().normalize('NFC');

function validateWriteInCandidates(candidates: unknown[]): WriteInCandidate[] {
    const result: WriteInCandidate[] = [];
    for (const c of candidates) {
        if (typeof c !== 'object' || c === null) {
            throw new BadRequest('Each write_in_candidate must be an object');
        }
        const obj = c as Record<string, unknown>;
        if (typeof obj.candidate_name !== 'string' || !obj.candidate_name.trim()) {
            throw new BadRequest('Each write_in_candidate must have a non-empty candidate_name string');
        }
        if (typeof obj.approved !== 'boolean') {
            throw new BadRequest('Each write_in_candidate must have a boolean approved field');
        }
        if (!Array.isArray(obj.aliases) || !obj.aliases.every((a: unknown) => typeof a === 'string')) {
            throw new BadRequest('Each write_in_candidate must have an aliases array of strings');
        }
        result.push({
            candidate_name: obj.candidate_name.trim(),
            approved: obj.approved,
            aliases: (obj.aliases as string[]).map((a: string) => a.trim()).filter(Boolean),
        });
    }
    return result;
}

const setWriteInResults = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    Logger.info(req, `setWriteInResults ${req.election.election_id}`);
    expectPermission(req.user_auth.roles, permissions.canProcessWriteIns)

    const write_in_results = req.body.write_in_results;
    if (typeof write_in_results !== 'object') {
        throw new BadRequest('write_in_results not provided or incorrect type')
    }
    if (!write_in_results.race_id || typeof write_in_results.race_id !== 'string') {
        throw new BadRequest('write_in_results.race_id is required')
    }
    if (!Array.isArray(write_in_results.write_in_candidates)) {
        throw new BadRequest('write_in_results.write_in_candidates must be an array')
    }

    const validatedCandidates = validateWriteInCandidates(write_in_results.write_in_candidates);

    // Server-side dedup check: reject if two incoming candidates trim-lowercase to same key
    const incomingKeys = new Set<string>();
    for (const c of validatedCandidates) {
        const key = trimLower(c.candidate_name);
        if (incomingKeys.has(key)) {
            throw new BadRequest(`Duplicate candidate name: "${c.candidate_name}"`)
        }
        incomingKeys.add(key);
    }

    const election_id = req.election.election_id;

    // Read the current election and note its update_date
    const election = await ElectionsModel.getElectionByID(election_id, req);
    if (!election) {
        throw new InternalServerError(`Election ${election_id} not found`);
    }
    const expected_update_date = election.update_date as string;

    // Modify in memory
    const race_index = election.races.findIndex(r => r.race_id === write_in_results.race_id);
    if (race_index === -1) {
        throw new BadRequest('Invalid Race ID')
    }
    if (!election.races[race_index].enable_write_in) {
        throw new BadRequest('Write-In not enabled for this race')
    }
    election.races[race_index].write_in_candidates = validatedCandidates;

    // Update with optimistic concurrency check
    const updatedElection = await ElectionsModel.updateElection(
        election,
        req,
        'Update Write-In Candidates',
        expected_update_date
    );
    res.json({ election: updatedElection });
}

export {
    setWriteInResults,
}
