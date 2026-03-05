import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { expectPermission } from "../controllerUtils";
import { BadRequest, InternalServerError } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { WriteInCandidate } from '@equal-vote/star-vote-shared/domain_model/WriteIn';

var ElectionsModel = ServiceLocator.electionsDb();

const trimLower = (s: string) => s.trim().toLowerCase();

function mergeWriteInCandidates(existing: WriteInCandidate[], incoming: WriteInCandidate[]): WriteInCandidate[] {
    // Build existingByKey: map trimLower(name) and trimLower(each alias) to the same object
    const existingByKey = new Map<string, WriteInCandidate>();
    for (const ex of existing) {
        existingByKey.set(trimLower(ex.candidate_name), ex);
        for (const alias of (ex.aliases || [])) {
            existingByKey.set(trimLower(alias), ex);
        }
    }

    // Track all keys referenced by incoming entries
    const seenKeys = new Set<string>();
    // Result map keyed by trimLower of official name
    const resultMap = new Map<string, WriteInCandidate>();

    for (const inc of incoming) {
        const key = trimLower(inc.candidate_name);
        const prior = existingByKey.get(key);

        // Official name: use incoming name (trimmed). If empty and prior had a name, keep prior.
        let officialName = inc.candidate_name.trim();
        if (!officialName && prior && prior.candidate_name.trim()) {
            officialName = prior.candidate_name.trim();
        }
        const officialKey = trimLower(officialName);

        // Collect all aliases: union of incoming aliases + prior aliases + prior name (if different)
        const aliasSet = new Map<string, string>(); // trimLower -> original form
        for (const a of (inc.aliases || [])) {
            const ak = trimLower(a);
            if (ak && ak !== officialKey) aliasSet.set(ak, a.trim());
        }
        if (prior) {
            for (const a of (prior.aliases || [])) {
                const ak = trimLower(a);
                if (ak && ak !== officialKey && !aliasSet.has(ak)) aliasSet.set(ak, a.trim());
            }
            const priorNameKey = trimLower(prior.candidate_name);
            if (priorNameKey && priorNameKey !== officialKey && !aliasSet.has(priorNameKey)) {
                aliasSet.set(priorNameKey, prior.candidate_name.trim());
            }
        }

        // Track all keys this incoming entry touches
        seenKeys.add(key);
        seenKeys.add(officialKey);
        for (const a of (inc.aliases || [])) {
            seenKeys.add(trimLower(a));
        }
        if (prior) {
            seenKeys.add(trimLower(prior.candidate_name));
            for (const a of (prior.aliases || [])) {
                seenKeys.add(trimLower(a));
            }
        }

        // Always include the official name itself as an alias so ballot lookup by name works
        if (officialName && !aliasSet.has(officialKey)) {
            aliasSet.set(officialKey, officialName);
        }

        resultMap.set(officialKey, {
            candidate_name: officialName,
            approved: inc.approved,
            aliases: Array.from(aliasSet.values()),
        });
    }

    // Preserve unseen existing candidates
    for (const ex of existing) {
        const exKey = trimLower(ex.candidate_name);
        const allExKeys = [exKey, ...(ex.aliases || []).map(trimLower)];
        const wasReferenced = allExKeys.some(k => seenKeys.has(k));
        if (!wasReferenced && !resultMap.has(exKey)) {
            resultMap.set(exKey, { ...ex });
        }
    }

    return Array.from(resultMap.values());
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

    // Server-side dedup check: reject if two incoming candidates trim-lowercase to same key
    const incomingKeys = new Set<string>();
    for (const c of write_in_results.write_in_candidates) {
        const key = trimLower(c.candidate_name);
        if (incomingKeys.has(key)) {
            throw new BadRequest(`Duplicate candidate name: "${c.candidate_name}"`)
        }
        incomingKeys.add(key);
    }

    const election_id = req.election.election_id;
    try {
        const updatedElection = await ElectionsModel.updateElectionInTransaction(
            election_id,
            (election) => {
                const race_index = election.races.findIndex(r => r.race_id === write_in_results.race_id);
                if (race_index === -1) {
                    throw new BadRequest('Invalid Race ID')
                }
                if (!election.races[race_index].enable_write_in) {
                    throw new BadRequest('Write-In not enabled for this race')
                }
                const existing = election.races[race_index].write_in_candidates || [];
                election.races[race_index].write_in_candidates = mergeWriteInCandidates(
                    existing,
                    write_in_results.write_in_candidates
                );
            },
            req,
            'Update Write-In Candidates'
        );
        res.json({ election: updatedElection });
    } catch (err) {
        if (err instanceof BadRequest || err instanceof InternalServerError) {
            throw err;
        }
        Logger.error(req, `Transaction error: ${err}`);
        throw new InternalServerError('Concurrent write detected, please try again');
    }
}

export {
    setWriteInResults,
}
