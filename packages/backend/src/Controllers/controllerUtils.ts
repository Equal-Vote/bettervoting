import { IRequest, IUser } from "../IRequest"
import { Election, electionValidation } from "@equal-vote/star-vote-shared/domain_model/Election";
import Logger from "../Services/Logging/Logger"
import { BadRequest, Unauthorized } from "@curveball/http-errors";
import { roles } from "@equal-vote/star-vote-shared/domain_model/roles";
import { permission } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { createHash, randomInt } from "crypto";
import ServiceLocator from "../ServiceLocator";
import { makeUniqueID , ID_LENGTHS } from "@equal-vote/star-vote-shared/utils/makeID";
const ElectionsModel =  ServiceLocator.electionsDb();

export async function expectValidElectionFromRequest(req:IRequest):Promise<Election> {
    const inputElection = req.body.Election;
    inputElection.election_id = await makeUniqueID(
        null,
        ID_LENGTHS.ELECTION,
        async (id: string) => Boolean(await ElectionsModel.electionExistsByID(id, req))
    );
    inputElection.create_date = new Date().toISOString()
    const validationErr = electionValidation(inputElection);
    if (validationErr) {
        Logger.info(req, "Invalid Election: " + validationErr, inputElection);
        throw new BadRequest("Invalid Election " + validationErr);
    }
    return inputElection;
}

export function expectPermission(roles:roles[],permission:permission): void {
        if (!roles.some( (role) => permission.includes(role))){
            throw new Unauthorized("Does not have permission")
      }
}

// Temp owners (a temp_id cookie, req.user.typ === 'TEMP_ID') get the full owner role
// during the temporary-access window, but finalizing is reserved for accounts: the
// wizard already blocks it in the UI, and this keeps a direct POST from bypassing that.
export function expectPermanentUser(user: IUser | undefined): void {
    if (!user?.sub || user.typ === 'TEMP_ID') {
        throw new Unauthorized("Create an account to finalize this election")
    }
}

// Write-ins only count once an election admin approves them (see setWriteInResultsController),
// so an election with write-ins must end up with a signed-in owner. Drafts are fine: finalizing
// already requires a signed-in user (expectPermanentUser above). This closes the other route,
// creating the election already finalized, as the wizard's ownerless "Publish Now" does;
// otherwise nobody could ever approve a write-in and every write-in vote would be dropped.
export function expectOwnerForWriteIns(election: Election, user: IUser | undefined): void {
    const hasWriteIns = (election.races ?? []).some((race) => race.enable_write_in);
    if (!hasWriteIns || election.state === 'draft') return;
    expectPermanentUser(user);
    if (election.owner_id !== user?.sub) {
        throw new BadRequest("Elections with write-in candidates must be owned by the signed-in user who creates them");
    }
}

// All electionDB writes require an expected_update_date for optimistic concurrency
// control; without it, concurrent edits would race the (election_id, head=true)
// unique partial index and surface as opaque 500s instead of clean 409s.
export function expectUpdateDate(req: IRequest): string {
    const expected_update_date = req.body?.expected_update_date;
    if (typeof expected_update_date !== 'string' || expected_update_date.length === 0) {
        throw new BadRequest("expected_update_date is required");
    }
    return expected_update_date;
}

// Note: it feels weird to have the same util function on both frontend and backend instead of using shared, but they need to use different libraries
export function hashString(inputString: string) {
    if(inputString === undefined) return undefined;
    return createHash('sha256').update(inputString).digest('hex')
}

// Fisher–Yates shuffle using crypto.randomInt so admins can't infer the
// insertion order of ballots or roll entries from the response order — that
// order would otherwise let an admin without DB access correlate ballots to
// voters by submission time.
export function secureShuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}