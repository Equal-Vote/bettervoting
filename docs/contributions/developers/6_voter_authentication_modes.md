---
layout: default
title: 🔐 Voter Authentication Modes
nav_order: 6
parent: 💻 Developers
---

# Voter Authentication Modes

This page is the backend-developer companion to [Security Options](https://docs.bettervoting.com/help/security_options.html). The end-user docs describe each option in product terms; this page maps each option to the **exact `ElectionSettings` fields** that represent it in the database, and to the canonical enum name we use in code.

Every live election is required to be in **one of six canonical modes**. The combination of `voter_access`, `voter_authentication`, and `invitation` defines the mode — no other combination is accepted by `electionSettingsValidation`.

The single source of truth is `packages/shared/src/domain_model/VoterAuthenticationMode.ts`. Use the helpers there instead of touching the three fields directly:

```ts
import {
  VoterAuthenticationMode,
  getVoterAuthenticationMode,
  setVoterAuthenticationMode,
} from '@equal-vote/star-vote-shared/domain_model/VoterAuthenticationMode';

const mode = getVoterAuthenticationMode(election.settings); // throws if non-canonical
const updated = setVoterAuthenticationMode(election.settings, 'open_unique_cookie');
```

## Terminology: two senses of "open" and "closed"

The words "open" and "closed" mean two unrelated things in this codebase. Be deliberate when reading or writing about elections:

| Sense | Field | Values | What it means |
|---|---|---|---|
| **Lifecycle state** | `election.state` | `draft`, `finalized`, `open`, `closed`, `archived` | Phase in the election's lifecycle. `draft` is editable. `finalized` is locked but not yet accepting votes. `open` is actively accepting votes. `closed` is no longer accepting votes. `archived` is in the public archive. |
| **Voter access (rolls)** | `election.settings.voter_access` | `open`, `closed` | Whether voters need to be on a roll. `voter_access='open'` (a.k.a. unrestricted, "open rolls") = anyone with the URL can attempt to vote. `voter_access='closed'` (a.k.a. restricted, "closed rolls") = a voter list controls eligibility. |

The two are **orthogonal**: a `state='open'` election can have either `voter_access='open'` or `voter_access='closed'`, and vice versa.

To stay unambiguous, this doc uses:

- **state=`open`** / **state=`closed`** / **state=`draft`** / ... (always in `code`) when referring to the lifecycle.
- **open-access** / **closed-access** / **open rolls** / **closed rolls** / "restricted" / "unrestricted" when referring to `voter_access`.
- Canonical mode names (`open_*`, `closed_*`) refer to `voter_access`, **never** to state. A `closed_admin_managed_ids` election can be in `state='draft'` or `state='open'` or any other state.

## Restricted (closed-access) Elections

### Email List → `closed_bv_managed_ids`

BetterVoting manages each voter's identity and sends each one a unique voting link by email.

```json
{
  "voter_access": "closed",
  "voter_authentication": { "voter_id": true },
  "invitation": "email"
}
```

### ID List → `closed_admin_managed_ids`

The election admin manages the list of voter IDs externally and distributes the shared vote link plus per-voter IDs themselves.

```json
{
  "voter_access": "closed",
  "voter_authentication": { "voter_id": true }
}
```

(`invitation` is absent — that's what distinguishes this from `closed_bv_managed_ids`.)

## Unrestricted (open-access) Elections

### One vote per device → `open_unique_cookie`

A cookie is set in the voter's browser to prevent revoting. This is the default for new open-access elections.

```json
{
  "voter_access": "open",
  "voter_authentication": { "voter_id": true }
}
```

### One vote per user → `open_unique_keycloak`

Voter must present a Keycloak-issued JWT (the `id_token` cookie) and the email claim from that token is used as the voter identity. Authentication path:

- `getUser` middleware (`packages/backend/src/Controllers/User/auth.controllers.ts`) calls `AccountService.extractUserFromRequest`, which reads the `id_token` cookie and verifies the JWT against Keycloak's public key with `algorithms: ['RS256']` (`AccountServiceUtils.ts:14-18`). Signature failure throws `Unauthorized`.
- `voterRollUtils.ts:124` rejects the request if `req.user?.email` is falsy, so an unauthenticated session (no token, or only a `temp_id` cookie which carries no email) cannot vote in this mode.

```json
{
  "voter_access": "open",
  "voter_authentication": { "email": true }
}
```

> Note: the field is called `email` for historical reasons. It means "Keycloak-authenticated user," not "voter typed an email address."

### One vote per Network → `open_unique_ip_address`

One vote per IP address.

```json
{
  "voter_access": "open",
  "voter_authentication": { "ip_address": true }
}
```

### No Limit → `open_open`

No deduplication of any kind. Useful for demos and shared-device polling.

```json
{
  "voter_access": "open",
  "voter_authentication": {}
}
```

## Summary Table

| Mode | `voter_access` | `voter_authentication` | `invitation` |
|---|---|---|---|
| `open_unique_cookie` | `open` | `{ voter_id: true }` | absent |
| `open_unique_keycloak` | `open` | `{ email: true }` | absent |
| `open_unique_ip_address` | `open` | `{ ip_address: true }` | absent |
| `open_open` | `open` | `{}` | absent |
| `closed_admin_managed_ids` | `closed` | `{ voter_id: true }` | absent |
| `closed_bv_managed_ids` | `closed` | `{ voter_id: true }` | `"email"` |

## How a mode is chosen and changed (admin flows)

An election's mode is set in one of four paths during creation, and editable from three admin surfaces afterward while preconditions hold. All paths funnel through `setVoterAuthenticationMode`, so every transition produces a canonical mode.

**Path 1 — Single-race inline publish** (`Wizard.tsx:108-122`)

Single-race wizard, user clicks Submit on the race form, accepts the `publish_confirm` dialog. The election skips the rest of the wizard entirely:

```
makeDefaultElection
  (voter_access: undefined, voter_authentication: { voter_id: true })
        |
        | RaceForm submit + confirm("Publish your simple poll now?") = yes
        v
onAddElection(
  setVoterAuthenticationMode(settings, 'open_unique_cookie'),
  state: 'finalized'
)
```

Mode is hardcoded to `open_unique_cookie`. Election is POSTed with `finalized` state, immediately.  Note that once the election is finalized, the voter authentication settings can never be changed.

**Path 2 — Multi-race wizard, full questions** (`WizardExtra.tsx`)

If multi-race was chosen in `WizardBasics`, the user always goes through the full `WizardExtra` stepper (3 steps):

```
Step 0 — Title.
Step 1 — "Is this a restricted election?" radio.
         Writes voter_access only (yes='closed', no='open'); leaves
         voter_authentication={voter_id:true} from the default.
         Transient state is canonical: 'open_unique_cookie' or
         'closed_admin_managed_ids' depending on the choice.
Step 2 — Template card. Calls setVoterAuthenticationMode with:
           voter_access='open':  demo       -> open_open
                                 unlisted   -> open_unique_cookie
           voter_access='closed': email_list -> closed_bv_managed_ids
                                  id_list    -> closed_admin_managed_ids
```

Completing this stepper does not finalize the election, and leaves room for more editing (see "Path 4" below).

**Path 3 — Single-race wizard, declined inline publish**

Same as Path 2 but skips Step 0 (title was already set during the race form). Mode-setting in Step 2 is identical.  Completing this stepper does not finalize the election, and leaves room for more editing (see "Path 4" below).

**Path 4 — Post-wizard admin editing**

Three admin surfaces can change the mode while the election is still in draft mode. Their gating is *not* uniform — read carefully:

| Surface | Visible when | Disabled when | Action |
|---|---|---|---|
| `ViewElectionRolls` "Restricted yes/no" radio | always | `state !== 'draft' \|\| electionRollData.length > 0` | `setVoterAuthenticationMode(settings, restricted ? 'closed_admin_managed_ids' : 'open_unique_cookie')` |
| `ViewElectionRolls` "Email list / ID list" radio | `voter_access === 'closed'` | `state !== 'draft' \|\| electionRollData.length > 0` | writes `invitation` directly: `'email'` → `closed_bv_managed_ids`, `undefined` → `closed_admin_managed_ids` |
| `ElectionAuthForm` four-way radio | `voter_access === 'open'` | `state !== 'draft'` (rolls **not** considered) | `setVoterAuthenticationMode(settings, one_of_four_open_modes)` |

The gating on `electionRollData.length > 0` is worth spelling out a bit more.
* When an election is still in draft mode, with `voter_access === 'open'`, the backend skips the roll creation steps.  Note that, for non-draft elections with `voter_access === 'open'`, the backend actually does create roll rows for every voter, right when the vote is cast (instead of relying on the admin to make the rolls).  But for draft elections, no rolls are created.  So if voter access is open, the `electionRollData.length > 0` gate is actually moot.  
* When an election is still in draft mode, with `voter_access === 'closed'`, the admin *can* create roll entries.  In fact, once they create any rolls at all, the voter authentication mode becomes permanently fixed as either `closed_bv_managed_ids` or `closed_admin_managed_ids`.  
* Once election is finalized, nobody can change voter authentication settings ever again (backend prevents it).

## Notes on latent fields

The `authentication` type in `ElectionSettings.ts` includes several flags — `phone`, `address`, `registration_data`, `registration_api_endpoint` — that no canonical mode uses and that `electionSettingsValidation` rejects. These are vestigial; do not add UI that writes them. The `VoterAccess` type also includes a third value `'registration'` which is preserved for a handful of historical rows but rejected on create/edit.
