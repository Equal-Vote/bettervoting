---
layout: default
title: 🔌 Backend API (Quick Reference)
nav_order: 7
parent: 💻 Developers
---

# Backend API Quick Reference

> **📚 For comprehensive documentation, see the [Backend Developer Guide](./backend/)** which includes:
> - [Domain Models](./backend/domain-models) - Complete reference for Election, Ballot, ElectionRoll objects
> - [Authentication & Authorization](./backend/authentication) - Roles, permissions, how access is determined
> - [Election Lifecycle](./backend/election-lifecycle) - States, transitions, what happens at each stage
> - [Voting Flow](./backend/voting-flow) - Everything about casting votes, validation, processing
> - [Election Roll Management](./backend/election-roll-management) - Adding voters, approval workflow
> - [API Endpoints Reference](./backend/api-endpoints) - Complete endpoint documentation with database operations

This page provides a quick reference for the most common API operations. All endpoints are prefixed with `/API`.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Election State Machine](#election-state-machine)
3. [Elections Endpoints](#elections-endpoints)
4. [Ballot Endpoints](#ballot-endpoints)
5. [Election Roll Endpoints](#election-roll-endpoints)
6. [Debug Endpoints](#debug-endpoints)
7. [Error Responses](#error-responses)

---

## Authentication & Authorization

### Authentication Methods

BetterVoting uses JWT-based authentication with tokens stored in cookies:

| Cookie | Purpose |
|--------|---------|
| `id_token` | Primary authentication token from Keycloak |
| `temp_id` | Temporary user ID for unauthenticated users (format: `v-{uuid}`) |
| `voter_id` | Base64-encoded voter ID for closed elections |
| `{election_id}_claim_key` | Claim key for transferring election ownership |

### User Roles

The system defines five roles with hierarchical permissions:

| Role | Description |
|------|-------------|
| `system_admin` | Full system access (internal use only) |
| `owner` | Election creator with full control |
| `admin` | Can manage election settings and voter rolls |
| `auditor` | Read-only access to ballots and rolls for auditing |
| `credentialer` | Can approve/flag voter registrations |

### Role Assignment

Roles are determined through the `electionPostAuthMiddleware`:

1. **Owner role** is granted if:
   - User's Keycloak ID matches `election.owner_id`, OR
   - For temporary users: `temp_id` cookie matches owner, election is < 24 hours old, AND claim key hash matches

2. **Admin/Auditor/Credentialer** roles are granted if the user's email appears in the respective `*_ids` array on the election

### Permission Matrix

| Permission | system_admin | owner | admin | auditor | credentialer |
|------------|:------------:|:-----:|:-----:|:-------:|:------------:|
| canEditElectionRoles | ✓ | ✓ | | | |
| canViewElection | ✓ | ✓ | ✓ | ✓ | ✓ |
| canEditElection | ✓ | ✓ | ✓ | | |
| canDeleteElection | ✓ | ✓ | | | |
| canEditElectionRoll | ✓ | ✓ | | | |
| canAddToElectionRoll | ✓ | ✓ | ✓ | | |
| canViewElectionRoll | ✓ | ✓ | ✓ | ✓ | ✓ |
| canFlagElectionRoll | ✓ | ✓ | ✓ | ✓ | ✓ |
| canApproveElectionRoll | ✓ | ✓ | ✓ | | ✓ |
| canInvalidateBallot | ✓ | ✓ | | | |
| canEditElectionState | ✓ | ✓ | | | |
| canViewBallots | ✓ | ✓ | ✓ | ✓ | |
| canDeleteAllBallots | ✓ | ✓ | ✓ | | |
| canViewPreliminaryResults | ✓ | ✓ | ✓ | ✓ | |
| canSendEmails | ✓ | ✓ | ✓ | | |
| canUploadBallots | ✓ | ✓ | | | |
| canClaimElection | ✓ | ✓ | | | |

---

## Election State Machine

Elections progress through states with specific transition rules:

```
┌─────────┐     finalize()      ┌───────────┐     start_time      ┌────────┐
│  draft  │ ──────────────────► │ finalized │ ──────────────────► │  open  │
└─────────┘                     └───────────┘     (automatic)     └────────┘
                                                                       │
                                                                       │ end_time OR
                                                                       │ setOpenState(false)
                                                                       ▼
                               ┌──────────┐     setOpenState(true)  ┌────────┐
                               │ archived │ ◄─────────────────────  │ closed │
                               └──────────┘      archive()          └────────┘
```

### State Descriptions

| State | Editable | Voting Allowed | Results Visible | Description |
|-------|:--------:|:--------------:|:---------------:|-------------|
| `draft` | ✓ | Test only | No | Initial state; election is being configured |
| `finalized` | No | No | No | Election is locked, waiting for start time |
| `open` | No | ✓ | If `public_results` | Voting is active |
| `closed` | No | No | ✓ | Voting ended; results available |
| `archived` | No | No | ✓ | Archived for historical reference |

### Automatic State Transitions

The middleware automatically transitions elections based on time:
- `finalized` → `open`: When current time ≥ `start_time` (or immediately if no start_time)
- `open` → `closed`: When current time > `end_time`

---

## Elections Endpoints

### Get Election by ID

Retrieves a specific election with voter authorization status.

```
GET /Election/{id}
```

**What it does:**
1. Loads the election from database by ID
2. Automatically updates election state if start/end times have passed
3. Determines the requesting user's roles (owner, admin, auditor, credentialer)
4. Checks if the user is authorized to vote and whether they've already voted
5. Filters races by precinct if the user has a precinct assigned
6. Removes sensitive fields (`auth_key`) before returning

**Authorization:** None required (public endpoint)

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID (case-insensitive slug or UUID) |

**Response:** `200 OK`
```json
{
  "election": { /* full election object */ },
  "precinctFilteredElection": { /* election with races filtered by voter's precinct */ },
  "voterAuth": {
    "authorized_voter": true,
    "has_voted": false,
    "required": null,
    "roles": ["owner"],
    "permissions": ["canEditElection", "canDeleteElection", ...]
  }
}
```

**Possible `voterAuth.required` values:**
- `null` - User is authorized
- `"Voter ID Required"` - Closed election requiring voter ID cookie
- `"User ID Required"` - Open election with device-based auth requiring login
- `"Email Validation Required"` - Email authentication required

---

### Check if Election Exists

Checks whether an election exists, including on the legacy classic.star.vote system.

```
GET /Election/{id}/exists
```

**What it does:**
1. Checks the new BetterVoting database for the election ID
2. If not found, makes a request to `classic.star.vote/{id}` with a 3-second timeout
3. Returns the existence status and location

**Authorization:** None required

**Response:** `200 OK`
```json
{
  "exists": true | false | "classic"
}
```

- `true` - Election exists in BetterVoting
- `"classic"` - Election exists on legacy classic.star.vote
- `false` - Election does not exist anywhere

---

### Claim Election 🔐

Transfers ownership of an election from a temporary user to a logged-in account.

```
POST /Election/{id}/claim
```

**What it does:**
1. Verifies the user has the `owner` role (via temp_id)
2. Verifies the user is logged in (not a temporary user)
3. Validates the claim key hash matches
4. Transfers ownership by setting `owner_id` to the logged-in user's ID

**Authorization:** Requires `canClaimElection` permission (owner role via temp_id)

**Preconditions for success:**
- User must be logged in (`user.typ === 'ID'`)
- User must have temp ownership (via `temp_id` cookie)
- Claim key must match: `hash(req.body.claim_key) === election.claim_key_hash`

**Request Body:**
```json
{
  "claim_key": "the-original-claim-key-from-election-creation"
}
```

**Response:** `200 OK` (empty body on success)

**Errors:**
- `401 Unauthorized` - Not logged in or claim key mismatch

---

### Delete Election 🔐

Permanently deletes an election and all associated data.

```
DELETE /Election/{id}
```

**What it does:**
1. Verifies the user has delete permission
2. Deletes the election record from the database
3. Note: Does NOT automatically delete associated ballots and rolls (they become orphaned)

**Authorization:** Requires `canDeleteElection` permission (system_admin or owner)

**Response:** `200 OK` - "Election Deleted"

**Errors:**
- `400 Bad Request` - Election doesn't exist or already deleted

---

### Get All Elections 🔐

Retrieves all elections relevant to the authenticated user, organized by relationship.

```
GET /Elections
```

**What it does:**
1. **Elections as official**: Queries elections where the user is owner, or their email is in admin_ids, audit_ids, or credential_ids
2. **Elections as unsubmitted voter**: Finds elections where the user has an election roll entry with `submitted=false` (excludes public elections where roll entry was auto-created)
3. **Elections as submitted voter**: Finds elections where the user has voted (`submitted=true`)
4. **Open elections**: Returns all publicly open elections (`state=open`, `is_public=true`, `voter_access=open`)
5. **Public archive elections**: Returns elections that are part of the public archive

**Authorization:** Returns more data for authenticated users; anonymous users only see public data

**Response:** `200 OK`
```json
{
  "elections_as_official": [/* elections user manages */],
  "elections_as_unsubmitted_voter": [/* private elections user is invited to */],
  "elections_as_submitted_voter": [/* elections user has voted in */],
  "public_archive_elections": [/* archived public elections */],
  "open_elections": [/* currently open public elections */]
}
```

---

### Create Election

Creates a new election in draft state.

```
POST /Elections
```

**What it does:**
1. Validates the election object against the schema (title length, race structure, settings, etc.)
2. Sets metadata: `create_date`, `update_date`, `head=true`
3. Assigns the election to the creating user (or temp_id if not logged in)
4. Inserts the election into the database

**Authorization:** None required (anyone can create)

**Validation Rules:**
- `election_id` must be lowercase string
- `title` must be 3-256 characters (except in draft state)
- `races` must be a non-empty array with unique `race_id` values
- `settings` object must pass validation
- No duplicate admin/audit/credential IDs

**Request Body:**
```json
{
  "Election": {
    "election_id": "my-election-2024",
    "title": "Board Election 2024",
    "description": "Annual board member election",
    "owner_id": "user-uuid-or-temp-id",
    "state": "draft",
    "races": [{
      "race_id": "race-1",
      "title": "President",
      "voting_method": "STAR",
      "num_winners": 1,
      "candidates": [...]
    }],
    "settings": {
      "voter_access": "open",
      "voter_authentication": { "ip_address": false, "email": false, "voter_id": false },
      "ballot_updates": false,
      "public_results": true
    }
  }
}
```

**Response:** `200 OK`
```json
{
  "election": { /* created election with server-assigned fields */ }
}
```

---

### Query Elections 🔐 (Admin Only)

Queries elections created within a time range. Used for administrative reporting.

```
POST /QueryElections
```

**What it does:**
1. Returns elections created between start_time and end_time
2. Excludes public archive elections
3. Returns ballot counts per election for analytics

**Authorization:** Intended for `canQueryElections` permission (currently unrestricted - see issue #976)

**Request Body:**
```json
{
  "start_time": "2024-01-01T00:00:00Z",
  "end_time": "2024-12-31T23:59:59Z"
}
```

**Response:** `200 OK`
```json
{
  "open_elections": [/* elections in range */],
  "closed_elections": [],
  "popular_elections": [],
  "vote_counts": [{ "election_id": "xxx", "v": 42 }, ...]
}
```

---

### Get Global Election Statistics

Returns aggregate statistics across all elections for the landing page.

```
GET /GlobalElectionStats
```

**What it does:**
1. Counts all ballots across elections (excluding `ballot_source='prior_election'`)
2. Counts elections with ≥2 votes
3. Adds legacy counts from `CLASSIC_ELECTION_COUNT` and `CLASSIC_VOTE_COUNT` env vars

**Authorization:** None required

**Response:** `200 OK`
```json
{
  "elections": 1523,
  "votes": 87654
}
```

---

### Edit Election 🔐

Modifies an existing election. Only allowed in draft state or for public archive elections.

```
POST /Election/{id}/edit
```

**What it does:**
1. Validates the user has edit permission
2. Validates the election object passes all schema rules
3. Checks the election is editable (state must be `draft` OR `public_archive_id` is set)
4. Verifies the election ID in the body matches the URL parameter
5. Enforces mutual exclusion: if `ballot_updates=true` and reopening election, sets `public_results=false`
6. Creates a new version of the election (temporal versioning)

**Authorization:** Requires `canViewBallots` permission (system_admin, owner, admin, auditor)

> **Note:** The code currently uses `canViewBallots` permission, though `canEditElection` would be more semantically appropriate.

**Preconditions for success:**
- Election must be in `draft` state, OR have a `public_archive_id` (admin upload)
- Election ID in body must match URL param
- All validation rules must pass

**Request Body:**
```json
{
  "Election": {
    "election_id": "my-election",
    "title": "Updated Title",
    /* ... all election fields ... */
  }
}
```

**Response:** `200 OK`
```json
{
  "election": { /* updated election */ },
  "voterAuth": { "roles": [...], "permissions": [...] }
}
```

**Errors:**
- `400 Bad Request` - Election not editable (wrong state)
- `400 Bad Request` - Election ID mismatch
- `400 Bad Request` - Validation failure (with specific error message)

---

### Edit Election Roles 🔐

Updates the admin, auditor, and credentialer assignments for an election.

```
PUT /Election/{id}/roles
```

**What it does:**
1. Verifies the user has permission to edit roles (owner only)
2. Updates the `admin_ids`, `audit_ids`, and `credential_ids` arrays
3. Creates a new version of the election

**Authorization:** Requires `canEditElectionRoles` permission (system_admin or owner)

**Request Body:**
```json
{
  "admin_ids": ["admin1@example.com", "admin2@example.com"],
  "audit_ids": ["auditor@example.com"],
  "credential_ids": ["credentialer@example.com"]
}
```

**Response:** `200 OK`
```json
{
  "election": { /* updated election */ }
}
```

---

### Get Election Results 🔐

Calculates and returns election results using the appropriate voting method tabulator.

```
GET /ElectionResult/{id}
```

**What it does:**
1. Checks result visibility permissions:
   - If `public_results=true`: Anyone can view
   - If `public_results=false` AND `state=open`: Requires `canViewPreliminaryResults` permission
   - If `state=closed`: Anyone can view
2. Loads all ballots for the election
3. For each race, runs the appropriate tabulation algorithm (STAR, IRV, Approval, etc.)
4. Returns detailed round-by-round results

**Authorization:**
- Public if `public_results=true` or `state=closed`
- Otherwise requires `canViewPreliminaryResults` (system_admin, owner, admin, auditor)

**Response:** `200 OK`
```json
{
  "election": { /* election object */ },
  "results": [
    {
      /* STAR results format with scoring round, runoff round, etc. */
      "summaryData": { ... },
      "voteCounts": { ... },
      "winner": { "name": "Alice", "id": "candidate-1" }
    }
  ]
}
```

**Errors:**
- `403 Forbidden` - Preliminary results not enabled and election is open

---

### Finalize Election 🔐

Transitions an election from draft to finalized state, locking it for voting.

```
POST /Election/{id}/finalize
```

**What it does:**
1. Verifies the user has permission to change election state
2. Verifies the election is currently in `draft` state
3. Deletes all test ballots created during draft mode
4. For closed elections with email invitations, verifies voter roll exists
5. Sets state to `finalized`
6. The election will automatically transition to `open` when `start_time` is reached

**Authorization:** Requires `canEditElectionState` permission (system_admin or owner)

**Preconditions for success:**
- Election must be in `draft` state
- For `voter_access=closed` with `invitation=email`: voter roll must exist

**Response:** `200 OK`
```json
{
  "election": { /* finalized election */ }
}
```

**Errors:**
- `400 Bad Request` - Election already finalized
- `400 Bad Request` - No voter roll for closed email election

---

### Set Public Results 🔐

Toggles whether election results are publicly visible during the election.

```
POST /Election/{id}/setPublicResults
```

**What it does:**
1. Verifies the user has permission to change election state
2. Sets `settings.public_results` to the provided value
3. When true, anyone can view live results; when false, only officials can see them

**Authorization:** Requires `canEditElectionState` permission (system_admin or owner)

**Important:** `public_results` and `ballot_updates` are mutually exclusive when election is open - you can't show live results while allowing voters to change their votes (to prevent vote buying).

**Request Body:**
```json
{
  "public_results": true
}
```

**Response:** `200 OK`
```json
{
  "election": { /* updated election */ }
}
```

---

### Archive Election 🔐

Moves an election to archived state for historical preservation.

```
POST /Election/{id}/archive
```

**What it does:**
1. Verifies the user has permission to change election state
2. Sets election state to `archived`
3. Archived elections are read-only and appear in historical listings

**Authorization:** Requires `canEditElectionState` permission (system_admin or owner)

**Preconditions for success:**
- Election must not already be archived

**Response:** `200 OK`
```json
{
  "election": { /* archived election */ }
}
```

---

### Set Open State 🔐

Manually opens or closes an election (for elections without scheduled times).

```
POST /Election/{id}/setOpenState
```

**What it does:**
1. Verifies the user has permission to change election state
2. Validates the state transition is allowed
3. For reopening: if `ballot_updates=true`, automatically sets `public_results=false`
4. Sets state to `open` or `closed` as requested

**Authorization:** Requires `canEditElectionState` permission (system_admin or owner)

**Preconditions for success:**
- Election must be in `open` or `closed` state
- Election must NOT have scheduled `start_time` or `end_time` (use those for automatic transitions)
- Cannot open an already-open election
- Cannot close an already-closed election

**Request Body:**
```json
{
  "open": true
}
```

**Response:** `200 OK`
```json
{
  "election": { /* updated election */ }
}
```

**Errors:**
- `400 Bad Request` - "Cannot close/open an election that is not open or closed"
- `400 Bad Request` - "Cannot open or close an election with scheduled start and end times"

---

### Send Invitations 🔐

Sends email invitations to all voters who haven't received one yet.

```
POST /Election/{id}/sendInvites
```

**What it does:**
1. Verifies the user has email-sending permission
2. Loads the voter roll for the election
3. Filters out voters who already received a successful invite (statusCode < 400)
4. Queues invitation emails for remaining voters via the event queue (pg-boss)
5. Each invitation includes a unique voting link with the voter's ID

**Authorization:** Requires `canSendEmails` permission (system_admin, owner, admin)

**Preconditions for success:**
- Election must have `voter_access=closed` AND `invitation=email`
- Voter roll must exist with at least one uninvited voter

**Email handling:**
- Emails are sent asynchronously via a job queue
- Each roll entry's `email_data.inviteResponse` is updated with the send status
- History entry added: `"email invite sent: success"` or `"email invite sent: failed"`

**Response:** `200 OK` (empty object)

**Errors:**
- `400 Bad Request` - No voter roll found
- `400 Bad Request` - All email invites have already been sent

---

### Send Invitation to Specific Voter 🔐

Sends an invitation email to a single voter.

```
POST /Election/{id}/sendInvite/{voter_id}
```

**What it does:**
1. Verifies the user has email-sending permission
2. Verifies email invitations are enabled for this election
3. Looks up the specific voter by voter_id
4. Sends the invitation email synchronously (not queued)
5. Updates the roll entry with the email response

**Authorization:** Requires `canSendEmails` permission (system_admin, owner, admin)

**Preconditions:**
- Election must have `voter_access=closed` AND `invitation=email`
- Voter must exist in the roll

**Response:** `200 OK`
```json
{
  "electionRoll": { /* updated roll entry with email_data */ }
}
```

---

### Sandbox Results

Calculates election results for arbitrary ballot data without creating an election.

```
POST /Sandbox
```

**What it does:**
1. Takes a cast vote record (CVR), candidate list, and voting method
2. Runs the appropriate tabulation algorithm
3. Returns results in the same format as real elections

**Authorization:** None required (public tool for testing)

**Use cases:**
- Testing voting methods with sample data
- Educational demonstrations
- Verifying tabulation logic

**Request Body:**
```json
{
  "cvr": [[5,4,3,2,1], [1,2,3,4,5], [3,3,3,3,3]],
  "candidates": ["Alice", "Bob", "Charlie", "Dana", "Eve"],
  "num_winners": 1,
  "votingMethod": "STAR"
}
```

**Response:** `200 OK`
```json
{
  "results": { /* tabulation results */ },
  "nWinners": 1,
  "candidates": ["Alice", "Bob", "Charlie", "Dana", "Eve"]
}
```

---

### Upload Image

Uploads an image to S3 for use in elections (candidate photos, etc.).

```
POST /images
```

**What it does:**
1. Accepts a file upload via multipart/form-data
2. Uploads to AWS S3 bucket
3. Returns the filename/URL for embedding

**Authorization:** None required

**Content-Type:** `multipart/form-data`

**Response:** `200 OK`
```json
{
  "photo_filename": "uploads/abc123.jpg"
}
```

---

## Ballot Endpoints

### Get Ballots by Election 🔐

Retrieves all ballots for an election with identifying information scrubbed.

```
GET /Election/{id}/ballots
```

**What it does:**
1. Verifies the user has ballot viewing permission
2. Verifies access conditions (public_results enabled OR election closed)
3. Loads all ballots for the election
4. Scrubs identifying information to protect voter anonymity:
   - Removes: `history`, `date_submitted`, `create_date`, `update_date`, `user_id`, `ip_hash`
   - Keeps: `ballot_id`, `election_id`, `votes`, `precinct`

**Authorization:** Requires `canViewBallots` permission (system_admin, owner, admin, auditor)

**Preconditions:**
- Either `public_results=true` OR election `state=closed`
- User must have ballot viewing permission

**Response:** `200 OK`
```json
{
  "election": { /* election object */ },
  "ballots": [
    {
      "ballot_id": "b-xxx",
      "election_id": "my-election",
      "votes": [{ "race_id": "r1", "scores": [...] }],
      "precinct": "District 1"
    }
  ]
}
```

---

### Get Anonymized Ballots

Retrieves ballots stripped of all identifying information for public analysis.

```
GET /Election/{id}/anonymizedBallots
```

**What it does:**
1. Checks access: `public_results=true` OR `state=closed` OR user has `canViewBallots` permission
2. Loads all submitted ballots (`status=submitted`, `head=true`)
3. Returns only: `ballot_id`, `election_id`, `votes`, `precinct`

**Authorization:**
- Public if `public_results=true` OR `state=closed`
- Otherwise requires `canViewBallots` permission

**Response:** `200 OK`
```json
{
  "ballots": [
    {
      "ballot_id": "b-xxx",
      "election_id": "my-election",
      "votes": [{ "race_id": "r1", "scores": [...] }],
      "precinct": "District 1"
    }
  ]
}
```

---

### Delete All Ballots 🔐

Resets all ballots for an election. Only allowed in draft mode or for public archive elections.

```
DELETE /Election/{id}/ballots
```

**What it does:**
1. Verifies the user has ballot deletion permission
2. Verifies the election is in draft mode OR is a public archive election
3. Deletes all ballots for the election from the database

**Authorization:** Requires `canDeleteAllBallots` permission (system_admin, owner, admin)

**Preconditions:**
- Election `state=draft` OR `public_archive_id` is not null

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Errors:**
- `400 Bad Request` - "Ballots can only be reset while in draft mode or if it's a public_archive election"

---

### Get Ballot by ID

Retrieves a specific ballot by its ID.

```
GET /Election/{id}/ballot/{ballot_id}
```

**What it does:**
1. Looks up the ballot by ID
2. Returns the ballot object if found

**Authorization:** None explicitly checked (relies on obscurity of ballot_id)

**Response:** `200 OK`
```json
{
  "ballot": {
    "ballot_id": "b-xxx",
    "election_id": "my-election",
    "status": "submitted",
    "votes": [...],
    ...
  }
}
```

---

### Cast Vote 🔐

Submits a ballot in an election.

```
POST /Election/{id}/vote
```

**What it does:**
1. Verifies election is in `open` or `draft` state
2. Checks voter authentication based on election settings:
   - `voter_id` required: Checks `voter_id` cookie (closed) or `user.sub` (open)
   - `email` required: User must be logged in with verified email
   - `ip_address` enabled: Hashes IP for duplicate detection
3. Gets or creates voter roll entry:
   - For closed elections: Must match existing roll entry
   - For open elections: Creates new roll entry if none exists
4. Validates voter authorization:
   - Roll state must be `approved`
   - If `ballot_updates=false` and already voted: Rejects
5. Validates ballot structure:
   - All race_ids must be in voter's approved races (precinct filtering)
   - No duplicate votes for same race
   - Scores must be in valid range for voting method
6. If `ballot_updates=true` and voter already voted: Updates existing ballot
7. Queues the vote event (pg-boss job queue for race condition handling)
8. Sends receipt email if email provided or on record
9. Returns ballot with `ballot_id` scrubbed (prevents vote selling)

**Authorization:** Based on election's voter_authentication settings

**Voter Authentication Requirements:**
| Setting | Requirement |
|---------|-------------|
| `voter_id` (closed) | `voter_id` cookie must match roll entry |
| `voter_id` (open) | User must be logged in |
| `email` | User must be logged in with email |
| `ip_address` | IP hash must match (if returning voter) |

**Ballot Validation:**
- Score ranges by voting method:
  - STAR/STAR_PR: 0-5
  - Approval/Plurality: 0-1
  - IRV/STV/RankedRobin: 1 to max_rankings (or number of candidates)

**Request Body:**
```json
{
  "ballot": {
    "election_id": "my-election",
    "status": "submitted",
    "votes": [
      {
        "race_id": "race-1",
        "scores": [
          { "candidate_id": "c1", "score": 5 },
          { "candidate_id": "c2", "score": 3 }
        ]
      }
    ],
    "precinct": "District 1"
  },
  "receiptEmail": "voter@example.com"
}
```

**Response:** `200 OK`
```json
{
  "ballot": {
    /* ballot object with ballot_id removed */
  }
}
```

**Errors:**
- `400 Bad Request` - "Election is not open"
- `400 Bad Request` - "Invalid Ballot: ..." (validation details)
- `400 Bad Request` - "User has already voted"
- `401 Unauthorized` - Missing authentication data (voter_id, email, etc.)
- `401 Unauthorized` - "User not authorized to vote"

---

### Upload Ballots 🔐

Bulk uploads ballots for an election (used for admin imports and prior election data).

```
POST /Election/{id}/uploadBallots
```

**What it does:**
1. Verifies user has ballot upload permission
2. For each ballot in the array:
   - Maps ordered votes to race/candidate structure using `race_order`
   - Validates the ballot
   - Creates ballot event
3. For `ballot_source=prior_election`: Bypasses queue and inserts directly
4. For live elections: Queues ballot events for processing
5. Emits socket event to update landing page statistics
6. Returns status for each ballot (success/failure with message)

**Authorization:** Requires `canUploadBallots` permission (system_admin, owner)

**Request Body:**
```json
{
  "race_order": [
    {
      "race_id": "race-1",
      "candidate_id_order": ["c1", "c2", "c3"]
    }
  ],
  "ballots": [
    {
      "voter_id": "voter-123",
      "ballot": {
        "orderedVotes": [
          [5, 3, 1, 0, 0]
        ]
      }
    }
  ]
}
```

The `orderedVotes` format is: `[score_for_c1, score_for_c2, ..., overvote_rank, has_duplicate_rank]`

**Response:** `200 OK`
```json
{
  "responses": [
    { "voter_id": "voter-123", "success": true, "message": "Success" },
    { "voter_id": "voter-456", "success": false, "message": "Error: ..." }
  ]
}
```

---

## Election Roll Endpoints

### Register Voter

Self-registers a voter for an election with registration-based voter access.

```
POST /Election/{id}/register
```

**What it does:**
1. Verifies election is in `open` state
2. Verifies election has `voter_access=registration`
3. Checks voter authentication requirements
4. Creates or updates roll entry with `state=registered` (pending approval)
5. Stores registration data for admin review

**Authorization:** Must satisfy election's authentication requirements

**Preconditions:**
- Election `state=open`
- Election `settings.voter_access=registration`
- User must provide required authentication (email, etc.)

**Response:** `200 OK`
```json
{
  "election": { /* election object */ },
  "NewElectionRoll": { /* created roll entry with state=registered */ }
}
```

---

### Get Rolls by Election 🔐

Retrieves the full voter roll for an election with sensitive data scrubbed.

```
GET /Election/{id}/rolls
```

**What it does:**
1. Verifies user has roll viewing permission
2. Verifies election is not open-access (roll viewing disabled for open elections)
3. Loads all roll entries for the election
4. Scrubs sensitive data:
   - Always removes: `ballot_id`, `ip_hash`
   - For email-invitation elections: Redacts `voter_id` (replaced with "Voter")
   - Sanitizes `history` and `email_data` fields

**Authorization:** Requires `canViewElectionRoll` permission (all official roles)

**Preconditions:**
- Election `settings.voter_access` must NOT be `open`

**Response:** `200 OK`
```json
{
  "election": { /* election object */ },
  "electionRoll": [
    {
      "election_id": "my-election",
      "email": "voter@example.com",
      "submitted": false,
      "state": "approved",
      "precinct": "District 1",
      "history": [{ "action_type": "added", "timestamp": 1234567890 }],
      "email_data": { "inviteResponse": { "statusCode": 202 } }
    }
  ]
}
```

---

### Get Roll by Voter ID 🔐

Retrieves a specific voter's roll entry.

```
GET /Election/{id}/rolls/{voter_id}
```

**What it does:**
1. Looks up the roll entry by election_id and voter_id
2. Applies same scrubbing as getRollsByElectionID

**Authorization:** Implicit (no explicit permission check in current implementation)

**Response:** `200 OK`
```json
{
  "electionRollEntry": { /* scrubbed roll entry */ }
}
```

---

### Add Election Roll 🔐

Adds voters to the election roll (for closed elections).

```
POST /Election/{id}/rolls
```

**What it does:**
1. Verifies user has permission to add to roll
2. Filters out empty entries
3. For email-invitation elections: Rejects entries with voter_id (must use auto-generated IDs)
4. Generates unique voter_ids for entries without them
5. Checks for duplicates (existing email or voter_id)
6. Checks voter limit (default 50 for free tier, configurable per election)
7. Creates roll entries with `state=approved`

**Authorization:** Requires `canAddToElectionRoll` permission (system_admin, owner, admin)

**Voter Limits:**
- Default: 50 voters for private elections (FREE_TIER_PRIVATE_VOTER_LIMIT)
- Can be overridden per-election via ELECTION_VOTER_LIMIT_OVERRIDES config

**Request Body:**
```json
{
  "electionRoll": [
    {
      "email": "voter1@example.com",
      "precinct": "District 1"
    },
    {
      "voter_id": "custom-id-123",
      "precinct": "District 2"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "election": { /* election object */ },
  "newElectionRoll": true
}
```

**Errors:**
- `400 Bad Request` - "Cannot create voters with voter_id when using email invitations"
- `400 Bad Request` - "Some submitted voters already exist: ..."
- `400 Bad Request` - "Request Denied: this election is limited to X voters"

---

### Edit Election Roll 🔐

Edits an existing election roll entry.

```
PUT /Election/{id}/rolls
```

**Authorization:** Requires `canEditElectionRoll` permission (system_admin, owner)

**Response:** `200 OK`
```json
{
  "electionRollEntry": { /* updated entry */ }
}
```

---

### Approve Election Roll 🔐

Approves a voter's registration (changes state from `registered` or `flagged` to `approved`).

```
POST /Election/{id}/rolls/approve
```

**What it does:**
1. Verifies user has approval permission
2. Looks up the roll entry by voter_id
3. Validates current state allows approval (`registered` or `flagged`)
4. Changes state to `approved`
5. Adds history entry

**Authorization:** Requires `canApproveElectionRoll` permission (system_admin, owner, admin, credentialer)

**Valid State Transitions:**
- `registered` → `approved`
- `flagged` → `approved`

**Request Body:**
```json
{
  "electionRollEntry": {
    "voter_id": "v-abc123"
  }
}
```

**Response:** `200 OK` (empty object)

---

### Flag Election Roll 🔐

Flags a voter's registration for review.

```
POST /Election/{id}/rolls/flag
```

**What it does:**
1. Changes roll state to `flagged`
2. Adds history entry with actor and timestamp

**Authorization:** Requires `canFlagElectionRoll` permission (all official roles)

**Valid State Transitions:**
- `approved` → `flagged`
- `registered` → `flagged`
- `invalid` → `flagged`

**Request Body:**
```json
{
  "electionRollEntry": {
    "voter_id": "v-abc123"
  }
}
```

**Response:** `200 OK` (empty object)

---

### Invalidate Election Roll 🔐

Invalidates a voter's registration (marks as ineligible).

```
POST /Election/{id}/rolls/invalidate
```

**What it does:**
1. Changes roll state to `invalid`
2. Invalidated voters cannot vote

**Authorization:** Requires `canInvalidateBallot` permission (system_admin, owner)

**Valid State Transitions:**
- `flagged` → `invalid`

Note: Can only invalidate from `flagged` state (must flag first).

**Response:** `200 OK` (empty object)

---

### Unflag Election Roll 🔐

Removes a flag from a voter's registration (reverts from `invalid` to `flagged`).

```
POST /Election/{id}/rolls/unflag
```

**Authorization:** Requires `canInvalidateBallot` permission (system_admin, owner)

**Valid State Transitions:**
- `invalid` → `flagged`

**Response:** `200 OK` (empty object)

---

### Reveal Voter ID by Email 🔐 (Emergency)

🚨 **EMERGENCY BREAK GLASS ENDPOINT** 🚨

Reveals the voter_id associated with an email address. This is an emergency-only function with extensive audit logging.

```
POST /Election/{id}/rolls/revealVoterId
```

**What it does:**
1. Verifies user has roll viewing permission
2. Verifies this is an email-invitation election (where voter_ids are normally hidden)
3. Finds the voter by email
4. Creates prominent audit log entries:
   - Logger.error with 🚨 BREAK GLASS ACTION 🚨 prefix
   - console.error with 🚨🚨🚨 prefix
   - History entry on the roll with `🚨 VOTER_ID_REVEALED` action
5. Returns the voter_id with warning

**Authorization:** Requires `canViewElectionRoll` permission

**Preconditions:**
- Election must use email invitations (`invitation=email`)
- Email must exist in voter roll

**Use Case:** When an admin needs to manually send a unique voting URL to a voter whose invite email failed.

**Request Body:**
```json
{
  "email": "voter@example.com"
}
```

**Response:** `200 OK`
```json
{
  "voter_id": "v-abc123xyz",
  "email": "voter@example.com",
  "warning": "This action has been logged in the audit trail"
}
```

---

## Debug Endpoints

### Health Check

Basic health check returning a timestamp.

```
GET /
```

**Response:** `200 OK` - Returns timestamp string (e.g., "19:40")

---

### Test Suite

Runs the internal test suite (development only).

```
GET /test
```

**Response:** `200 OK` - Returns test results

---

## Error Responses

All endpoints may return the following error responses:

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid input, validation failure, invalid state transition |
| 401 | Unauthorized | Missing authentication, invalid credentials |
| 403 | Forbidden | User lacks required permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Database error, unexpected exception |

**Error Response Format:**
```json
{
  "error": "Detailed error message"
}
```

**Common Error Messages:**

| Message | Cause | Solution |
|---------|-------|----------|
| "Election not found" | Invalid election ID | Check election ID |
| "Election is not open" | Voting on closed election | Wait for election to open |
| "User has already voted" | Duplicate vote attempt | N/A (ballot_updates=false) |
| "User not authorized to vote" | Roll state not approved | Contact election admin |
| "Voter ID Required" | Missing voter_id cookie | Enter voter ID |
| "Email Validation Required" | Not logged in | Log in with email |
| "Election is not editable" | Editing finalized election | Only draft elections editable |
| "Invalid Ballot: ..." | Ballot validation failed | Check ballot structure |
