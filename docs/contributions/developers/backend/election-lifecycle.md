---
layout: default
title: 🔄 Election Lifecycle
nav_order: 3
parent: 🔧 Backend Developer Guide
grand_parent: 💻 Developers
---

# Election Lifecycle

This document explains the complete lifecycle of an election, from creation to archival.

---

## Table of Contents

1. [Overview](#overview)
2. [State Machine](#state-machine)
3. [Creating an Election](#creating-an-election)
4. [Draft State](#draft-state)
5. [Finalizing](#finalizing)
6. [Finalized State](#finalized-state)
7. [Opening](#opening)
8. [Open State](#open-state)
9. [Closing](#closing)
10. [Closed State](#closed-state)
11. [Archiving](#archiving)
12. [Deleting Elections](#deleting-elections)
13. [Claiming Elections](#claiming-elections)

---

## Overview

Every election goes through a defined sequence of states. The state determines what operations are allowed and what voters can do.

```
Creation → Draft → Finalized → Open → Closed → Archived
```

Most transitions are one-way, though `open` ↔ `closed` can be toggled (if no scheduled times).

---

## State Machine

```
                                   finalize()
    ┌─────────┐                  ┌───────────┐
    │         │                  │           │
    │  DRAFT  │ ────────────────►│ FINALIZED │
    │         │                  │           │
    └─────────┘                  └─────┬─────┘
         │                             │
         │ delete()                    │ start_time passes
         ▼                             │ (or immediate if not set)
      [DELETED]                        │
                                       ▼
                                 ┌───────────┐
                                 │           │
                 ┌───────────────│   OPEN    │◄──────────────┐
                 │               │           │               │
                 │               └─────┬─────┘               │
                 │                     │                     │
                 │    end_time passes  │  setOpenState(true) │
                 │    OR setOpenState  │  (no scheduled      │
                 │        (false)      │   times only)       │
                 │                     ▼                     │
                 │               ┌───────────┐               │
                 │               │           │               │
                 └───────────────│  CLOSED   │───────────────┘
                   archive()     │           │
                                 └─────┬─────┘
                                       │
                                       │ archive()
                                       ▼
                                 ┌───────────┐
                                 │           │
                                 │ ARCHIVED  │
                                 │           │
                                 └───────────┘
```

---

## Creating an Election

### API Endpoint

```
POST /API/Elections
```

### What Happens

1. **Request received** with election object in body
2. **Validation** - `electionValidation()` checks:
   - `election_id` is lowercase string
   - `title` exists (can be short in draft)
   - `races` array is non-empty
   - Each race passes `raceValidation()`
   - `settings` passes `electionSettingsValidation()`
3. **Owner assignment**:
   - If user is logged in: `owner_id = user.sub` (Keycloak UUID)
   - If not logged in: `owner_id = temp_id` (format: "v-{uuid}")
4. **Metadata set**:
   - `state = 'draft'`
   - `create_date = now (ISO 8601)`
   - `update_date = now (epoch ms)`
   - `head = true`
   - `ballot_source = 'live_election'`
5. **Database insert** - New row in `electionDB`
6. **Response** - Returns created election with claim key (if temp user)

### Database Operations

**Writes to:** `electionDB`

```sql
INSERT INTO electionDB (
    election_id, title, description, owner_id, state, races, settings,
    create_date, update_date, head, ballot_source, ...
) VALUES (...);
```

### Authorization

- **None required** - Anyone can create elections
- Temp users get 24-hour ownership via claim key mechanism

### Example Request

```json
POST /API/Elections
{
  "Election": {
    "election_id": "my-poll-2024",
    "title": "Team Lunch Vote",
    "description": "Vote for Friday lunch location",
    "state": "draft",
    "owner_id": "v-abc123",
    "frontend_url": "https://bettervoting.com",
    "races": [{
      "race_id": "lunch",
      "title": "Lunch Location",
      "voting_method": "STAR",
      "num_winners": 1,
      "candidates": [
        {"candidate_id": "pizza", "candidate_name": "Pizza Place"},
        {"candidate_id": "sushi", "candidate_name": "Sushi Bar"},
        {"candidate_id": "tacos", "candidate_name": "Taco Truck"}
      ]
    }],
    "settings": {
      "voter_access": "open",
      "voter_authentication": {"ip_address": false},
      "public_results": true
    }
  }
}
```

---

## Draft State

### What is Draft?

`draft` is the initial state where the election is being configured. Think of it as a sandbox where you can experiment freely.

### What's Allowed in Draft

| Operation | Allowed | Notes |
|-----------|:-------:|-------|
| Edit title, description | ✓ | Title can be < 3 chars |
| Edit races, candidates | ✓ | Full flexibility |
| Edit settings | ✓ | All settings changeable |
| Add/remove voter roll | ✓ | For closed elections |
| Cast test votes | ✓ | Ballots saved but deleted on finalize |
| View test results | ✓ | For testing tabulation |
| Delete election | ✓ | Only in draft |

### Test Voting in Draft

Voters can cast ballots in draft state for testing. These ballots are **permanently deleted** when the election is finalized. This allows:

- Testing the voting experience
- Verifying tabulation works correctly
- Training administrators

### Editing in Draft

The `editElection` endpoint checks:

```typescript
if (inputElection.state !== 'draft' && inputElection.public_archive_id === null) {
    throw new BadRequest("Election is not editable");
}
```

Only draft elections (or public archive elections) can be edited.

---

## Finalizing

### API Endpoint

```
POST /API/Election/{id}/finalize
```

### What Happens

1. **Permission check** - `canEditElectionState` required (owner or system_admin)
2. **State check** - Must be in `draft` state
3. **Delete test ballots** - All ballots from draft testing are removed:
   ```typescript
   await BallotModel.deleteAllBallotsForElectionID(electionId);
   ```
4. **Validate voter roll** (if closed + email):
   - For `voter_access='closed'` with `invitation='email'`
   - Checks that voter roll exists
5. **Update state** - `state = 'finalized'`
6. **Save** - Creates new version in database

### Database Operations

**Reads from:** `electionDB`, `electionRollDB`
**Writes to:** `electionDB`
**Deletes from:** `ballotDB` (test ballots)

### What Changes After Finalizing

| Before (Draft) | After (Finalized) |
|----------------|-------------------|
| Can edit everything | Cannot edit anything |
| Test votes allowed | No voting yet |
| Can delete election | Cannot delete (must archive or contact admin) |
| Voter roll editable | Voter roll locked |

### Point of No Return

Finalizing is essentially irreversible:
- Cannot go back to draft
- All test data is wiped
- Settings are locked

This is why the UI requires explicit confirmation.

---

## Finalized State

### What is Finalized?

`finalized` is a waiting state. The election is locked and ready, but voting hasn't started yet.

### Automatic Transition to Open

The system automatically opens elections based on `start_time`:

```typescript
// In electionPostAuthMiddleware:
if (election.state === 'finalized') {
    if (election.start_time) {
        const startTime = new Date(election.start_time);
        if (currentTime > startTime) {
            election.state = 'open';
            await ElectionsModel.updateElection(election);
        }
    } else {
        // No start_time = open immediately
        election.state = 'open';
        await ElectionsModel.updateElection(election);
    }
}
```

This check runs on every request to the election, so the transition happens when:
- Someone visits the election page
- An API call is made for this election
- A voter tries to vote

### Behavior in Finalized

- Voting not yet allowed
- Results not visible
- Settings cannot be changed
- Waiting for start_time or next access

---

## Opening

### Automatic Opening

If `start_time` is set, the election opens automatically when that time passes (as described above).

### Manual Opening

If no `start_time` is set and you want to control timing manually:

1. Finalize the election
2. It transitions to `open` on next access (immediately if no start_time)

There's no separate "manual open" API - elections without `start_time` open immediately after finalization.

---

## Open State

### What is Open?

`open` is the active voting period. Voters can cast ballots.

### What Happens When Open

| Operation | Allowed | Notes |
|-----------|:-------:|-------|
| Cast votes | ✓ | Primary purpose |
| Update votes | Conditional | Only if `ballot_updates=true` |
| View results | Conditional | Only if `public_results=true` |
| Edit election | No | Locked |
| Edit voter roll | Limited | Can add voters, cannot remove |
| Send invitations | ✓ | For closed + email |
| Delete election | No | Must close first |

### Vote Processing

Every vote goes through:

1. Election state check (must be `open` or `draft`)
2. Voter authentication check
3. Roll lookup/creation
4. Authorization check (approved, not already voted unless updates allowed)
5. Ballot validation
6. Queue submission (pg-boss)
7. Async processing (save ballot, update roll, send receipt)

### Real-time Results

If `public_results=true`:
- Results visible at `/API/ElectionResult/{id}`
- Updates as votes come in
- Cannot be enabled if `ballot_updates=true`

---

## Closing

### Automatic Closing

If `end_time` is set:

```typescript
if (election.state === 'open') {
    if (election.end_time) {
        const endTime = new Date(election.end_time);
        if (currentTime > endTime) {
            election.state = 'closed';
            await ElectionsModel.updateElection(election);
        }
    }
}
```

### Manual Closing

For elections without `end_time`:

```
POST /API/Election/{id}/setOpenState
{
  "open": false
}
```

**Requirements:**
- `canEditElectionState` permission
- Election must be `open`
- Election must NOT have `start_time` or `end_time` set

### What Changes When Closed

| Open State | Closed State |
|------------|--------------|
| Can vote | Cannot vote |
| Results conditional | Results always visible |
| Active election | Historical record |

---

## Closed State

### What is Closed?

`closed` means voting has ended. Results are available to everyone.

### Behavior in Closed

| Operation | Allowed | Notes |
|-----------|:-------:|-------|
| Vote | No | Voting ended |
| View results | ✓ | Always public now |
| View ballots | ✓ | With permission |
| Reopen | Conditional | Only if no scheduled times |
| Archive | ✓ | Final step |

### Reopening

Elections can be reopened if they DON'T have scheduled times:

```
POST /API/Election/{id}/setOpenState
{
  "open": true
}
```

**Validation:**
```typescript
if (election.start_time || election.end_time) {
    throw new BadRequest("Cannot open/close with scheduled times");
}
```

**Why this restriction?** If there's an `end_time`, reopening would cause immediate re-close on next access.

### Mutual Exclusion on Reopen

When reopening with `ballot_updates=true`:

```typescript
if (election.settings.ballot_updates && election.state === "open" 
    && election.settings.public_results) {
    election.settings.public_results = false;
}
```

This ensures you can't have live results while allowing vote changes (prevents vote buying).

---

## Archiving

### API Endpoint

```
POST /API/Election/{id}/archive
```

### What Happens

1. **Permission check** - `canEditElectionState` required
2. **State check** - Must not already be archived
3. **Update state** - `state = 'archived'`
4. **Save** - Creates new version

### Database Operations

**Writes to:** `electionDB`

```sql
-- Via Kysely:
UPDATE electionDB SET head = false 
WHERE election_id = ? AND head = true;

INSERT INTO electionDB (..., state = 'archived', head = true, ...);
```

### Archived Behavior

Archived elections:
- Cannot be modified
- Cannot be reopened
- Results remain visible
- May appear in historical listings
- Data preserved indefinitely

---

## Deleting Elections

### API Endpoint

```
DELETE /API/Election/{id}
```

### What Actually Happens

**Important:** The current implementation only deletes from `electionDB`:

```typescript
const success = await ElectionsModel.delete(electionId);
```

This does **NOT** automatically delete:
- Associated ballots in `ballotDB`
- Associated rolls in `electionRollDB`

Those become orphaned (no foreign key constraints).

### When Deletion is Allowed

Only in `draft` state:
- The code doesn't explicitly check state
- But generally used for draft cleanup

### Database Operations

**Deletes from:** `electionDB`

```sql
DELETE FROM electionDB WHERE election_id = ?;
-- Returns all deleted rows (all versions)
```

### Full Cleanup

For complete deletion including all data, use `deleteAllElectionData()`:

```typescript
// In Elections.ts model:
async deleteAllElectionData(election_id): Promise<void> {
    return this._postgresClient.transaction().execute(async (trx) => {
        await trx.deleteFrom('electionDB').where('election_id', '=', election_id);
        await trx.deleteFrom('ballotDB').where('election_id', '=', election_id);
        await trx.deleteFrom('electionRollDB').where('election_id', '=', election_id);
    });
}
```

This is used internally but not exposed via API.

---

## Claiming Elections

### What is Claiming?

When a user creates an election without being logged in, they get temporary ownership via `temp_id`. Claiming transfers ownership to a real account.

### API Endpoint

```
POST /API/Election/{id}/claim
{
  "claim_key": "original-key-from-creation"
}
```

### What Happens

1. **Permission check** - Must have `owner` role (via temp_id mechanism)
2. **Login check** - Must be logged in (`user.typ === 'ID'`)
3. **Key verification** - `hash(claim_key) === election.claim_key_hash`
4. **Transfer ownership** - `election.owner_id = user.sub`
5. **Save** - Creates new version

### Example Flow

```
1. Anonymous user creates election
   - owner_id = "v-abc123" (temp_id)
   - claim_key_hash = hash("secret-key-xyz")
   - User shown claim_key once: "secret-key-xyz"

2. User saves claim_key
   - Stored in cookie: election_id_claim_key = "secret-key-xyz"

3. User logs in later

4. User clicks "Claim Election"
   - POST /API/Election/{id}/claim
   - body: { claim_key: "secret-key-xyz" }

5. Verification passes
   - temp_id cookie matches owner_id ✓
   - < 24 hours since creation ✓
   - hash(claim_key) matches claim_key_hash ✓

6. Ownership transferred
   - owner_id = user's Keycloak UUID
   - Permanent ownership established
```

### Time Limit

Temporary ownership expires after 24 hours (`TEMPORARY_ACCESS_HOURS`). After that:
- Cannot edit even with temp_id
- Must contact support to recover election
