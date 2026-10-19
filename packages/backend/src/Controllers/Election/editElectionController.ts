import { Election, electionValidation } from '@equal-vote/star-vote-shared/domain_model/Election';
import ServiceLocator from '../../ServiceLocator';
import Logger from '../../Services/Logging/Logger';
import { expectPermission, expectUpdateDate } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { BadRequest } from "@curveball/http-errors";
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';

const ElectionsModel = ServiceLocator.electionsDb();
const ElectionRollModel = ServiceLocator.electionRollDb();

// The fields this endpoint lets an editor change. The stored election is the base and
// everything else (state, owner, roles, archive/claim/auth keys, timestamps) is kept
// from it; those change only through their own endpoints.
type EditableField = 'title' | 'description' | 'frontend_url' | 'start_time' | 'end_time' | 'races' | 'settings' | 'is_public';

const editElection = async (req: IElectionRequest, res: Response, _next: NextFunction) => {
    const inputElection = req.body.Election;
    Logger.info(req, `editElection: ${inputElection?.election_id}`)
    expectPermission(req.user_auth.roles, permissions.canEditElection)

    if (!inputElection || typeof inputElection !== 'object') {
        throw new BadRequest("Invalid Election: Election is null");
    }
    if (inputElection.election_id != req.params.id) {
        Logger.info(req, `Body Election ${inputElection.election_id} != param ID ${req.params.id}`);
        throw new BadRequest("Election ID must match the URL Param")
    }
    if (req.election.state !== 'draft' && req.election.public_archive_id == null) {
        Logger.info(req, `Election is not editable, state=${req.election.state}`);
        throw new BadRequest("Election is not editable")
    }

    const edits: Pick<Election, EditableField> = {
        title: inputElection.title,
        description: inputElection.description,
        frontend_url: inputElection.frontend_url,
        start_time: inputElection.start_time,
        end_time: inputElection.end_time,
        races: inputElection.races,
        settings: inputElection.settings,
        is_public: inputElection.is_public,
    };
    const election: Election = { ...req.election, ...edits };

    const validationErr = electionValidation(election);
    if (validationErr) {
        Logger.info(req, `Invalid Election: '${election.election_id}'` + validationErr);
        throw new BadRequest("Invalid Election: " + validationErr);
    }

    // Voter groups validation and mutation
    const newGroupsRaw = election.settings?.voter_groups;
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
            const rolls = await ElectionRollModel.getRollsByElectionID(election.election_id, req) ?? [];
            for (const group of removedGroups) {
                const count = rolls.filter((r) => r.precinct === group).length;
                if (count > 0) {
                    throw new BadRequest(
                        `Can't delete voter group "${group}": ${count} voter${count === 1 ? '' : 's'} use it`
                    );
                }
            }
            election.races = election.races.map((race: import('@equal-vote/star-vote-shared/domain_model/Race').Race) => {
                if (!race.precincts) return race;
                return {
                    ...race,
                    precincts: race.precincts.filter(
                        (p: string) => !removedGroups.some((rg: string) => rg.toLowerCase() === p.toLowerCase())
                    ),
                };
            });
        }

        election.settings.voter_groups = trimmed;
    }

    const failMsg = `Failed to update election`;

    const expected_update_date = expectUpdateDate(req);
    const updatedElection = await ElectionsModel.updateElection(election, req, `User editing draft Election`, expected_update_date);
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
