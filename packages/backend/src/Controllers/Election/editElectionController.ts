import { electionValidation } from '@equal-vote/star-vote-shared/domain_model/Election';
import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { expectPermission, expectUpdateDate } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionsModel = ServiceLocator.electionsDb();
const ElectionRollModel = ServiceLocator.electionRollDb();


const editElection = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    const inputElection = req.body.Election;
    Logger.info(req, `editElection: ${inputElection?.election_id}`)
    expectPermission(req.user_auth.roles, permissions.canEditElection)
    const validationErr = electionValidation(inputElection);
    if (validationErr) {
        Logger.info(req, `Invalid Election: '${inputElection?.election_id}'` + validationErr);
        throw new BadRequest("Invalid Election: " + validationErr);
    }

    if (inputElection.state !== 'draft' && inputElection.public_archive_id === null) {
        Logger.info(req, `Election is not editable, state=${inputElection.state}`);
        throw new BadRequest("Election is not editable")
    }
    if (inputElection.election_id != req.params.id) {
        Logger.info(req, `Body Election ${inputElection.election_id} != param ID ${req.params.id}`);
        throw new BadRequest("Election ID must match the URL Param")
    }

    // Voter groups validation and mutation
    const newGroupsRaw = inputElection.settings?.voter_groups;
    if (newGroupsRaw !== undefined) {
        const trimmed = newGroupsRaw.map((g: string) => g.trim());

        const emptyIndex = trimmed.findIndex((g: string) => g === '');
        if (emptyIndex >= 0) {
            throw new BadRequest("Voter group names cannot be empty");
        }

        const seen = new Set<string>();
        for (const g of trimmed) {
            const lower = g.toLowerCase();
            if (seen.has(lower)) {
                throw new BadRequest("A group with this name already exists");
            }
            seen.add(lower);
        }

        const currentGroups: string[] = req.election.settings?.voter_groups ?? [];
        const removedGroups = currentGroups.filter(
            (cg: string) => !trimmed.some((ng: string) => ng.toLowerCase() === cg.toLowerCase())
        );

        if (removedGroups.length > 0) {
            const rolls = await ElectionRollModel.getRollsByElectionID(inputElection.election_id, req) ?? [];
            for (const group of removedGroups) {
                const count = rolls.filter((r) => r.precinct === group).length;
                if (count > 0) {
                    throw new BadRequest(
                        `Can't delete voter group "${group}": ${count} voter${count === 1 ? '' : 's'} use it`
                    );
                }
            }
            inputElection.races = inputElection.races.map((race: import('@equal-vote/star-vote-shared/domain_model/Race').Race) => {
                if (!race.precincts) return race;
                return {
                    ...race,
                    precincts: race.precincts.filter(
                        (p: string) => !removedGroups.some((rg: string) => rg.toLowerCase() === p.toLowerCase())
                    ),
                };
            });
        }

        inputElection.settings.voter_groups = trimmed;
    }

    Logger.debug(req, `election ID = ${inputElection}`);
    const failMsg = `Failed to update election`;

    const expected_update_date = expectUpdateDate(req);
    const updatedElection = await ElectionsModel.updateElection(inputElection, req, `User editing draft Election`, expected_update_date);
    if (!updatedElection) {
        Logger.error(req, failMsg);
        throw new BadRequest(failMsg)
    }
    req.election = updatedElection
    Logger.debug(req, `editElection succeeds for ${updatedElection.election_id}`);

    res.json({ election: req.election, voterAuth: { authorized_voter: req.authorized_voter, has_voted: req.has_voted, roles: req.user_auth.roles, permissions: req.user_auth.permissions  } })
}

export  {
    editElection
}
