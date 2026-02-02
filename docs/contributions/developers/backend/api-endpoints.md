---
layout: default
title: 🔌 API Endpoints Reference
nav_order: 6
parent: 🔧 Backend Developer Guide
grand_parent: 💻 Developers
---

# API Endpoints Reference

This document provides a detailed reference for every API endpoint, including database operations, authorization, and complete request/response examples.

---

## Table of Contents

1. [Election Endpoints](#election-endpoints)
2. [Ballot Endpoints](#ballot-endpoints)
3. [Election Roll Endpoints](#election-roll-endpoints)
4. [Results & Statistics](#results--statistics)
5. [Utility Endpoints](#utility-endpoints)

---

## Election Endpoints

### GET /Election/{id}

Retrieves an election by ID, with automatic state updates and voter authorization info.

#### Authorization
- **None required** (public endpoint)

#### Database Operations
- **Reads:** `electionDB WHERE election_id = ? AND head = true`
- **Reads:** `electionRollDB` (for voter authorization)
- **May Write:** `electionDB` (if state transition needed due to start/end time)

#### Request
```
GET /API/Election/my-election-2024
```

#### Response (200 OK)
```json
{
  "election": {
    "election_id": "my-election-2024",
    "title": "Board Election 2024",
    "description": "Annual board member election",
    "state": "open",
    "owner_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "races": [{
      "race_id": "president",
      "title": "President",
      "voting_method": "STAR",
      "num_winners": 1,
      "candidates": [
        {"candidate_id": "alice", "candidate_name": "Alice Smith"},
        {"candidate_id": "bob", "candidate_name": "Bob Jones"}
      ]
    }],
    "settings": {
      "voter_access": "open",
      "voter_authentication": {"email": false, "voter_id": false, "ip_address": false},
      "public_results": true,
      "ballot_updates": false
    },
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-31T23:59:59Z",
    "create_date": "2023-12-15T10:00:00Z",
    "update_date": "1702634400000",
    "head": true,
    "ballot_source": "live_election"
  },
  "precinctFilteredElection": {
    "...same as election but races filtered by voter precinct..."
  },
  "voterAuth": {
    "authorized_voter": true,
    "has_voted": false,
    "required": null,
    "roles": ["owner"],
    "permissions": ["canEditElection", "canDeleteElection", "..."]
  }
}
```

#### voterAuth.required Values
| Value | Meaning |
|-------|---------|
| `null` | All requirements met, can vote |
| `"Voter ID Required"` | Closed election, missing voter_id cookie |
| `"User ID Required"` | Open election + voter_id auth, not logged in |
| `"Email Validation Required"` | Email auth required, not logged in |

---

### GET /Election/{id}/exists

Checks if an election exists (including legacy classic.star.vote).

#### Authorization
- **None required**

#### Database Operations
- **Reads:** `electionDB WHERE election_id = ?`
- **External call:** HTTP to classic.star.vote if not found locally

#### Response (200 OK)
```json
{
  "exists": true | false | "classic"
}
```

---

### POST /Elections

Creates a new election.

#### Authorization
- **None required** (anyone can create)

#### Database Operations
- **Writes:** `electionDB` (INSERT)

#### Request
```json
{
  "Election": {
    "election_id": "my-poll",
    "title": "Lunch Vote",
    "state": "draft",
    "owner_id": "v-abc123",
    "frontend_url": "https://bettervoting.com",
    "races": [{
      "race_id": "lunch",
      "title": "Where to eat?",
      "voting_method": "STAR",
      "num_winners": 1,
      "candidates": [
        {"candidate_id": "pizza", "candidate_name": "Pizza"},
        {"candidate_id": "tacos", "candidate_name": "Tacos"}
      ]
    }],
    "settings": {
      "voter_access": "open",
      "voter_authentication": {},
      "public_results": true
    }
  }
}
```

#### Response (200 OK)
```json
{
  "election": {
    "election_id": "my-poll",
    "title": "Lunch Vote",
    "state": "draft",
    "...all fields with server-generated values..."
  }
}
```

---

### POST /Election/{id}/edit

Updates an election (draft state only).

#### Authorization
- **Requires:** `canViewBallots` permission (owner, admin, auditor)

#### Database Operations
- **Reads:** `electionDB WHERE election_id = ? AND head = true`
- **Writes:** `electionDB` (INSERT new version, UPDATE old version head=false)

#### Preconditions
- Election must be in `draft` state, OR
- Election must have `public_archive_id` set

#### Request
```json
{
  "Election": {
    "election_id": "my-poll",
    "title": "Updated Title",
    "...all election fields..."
  }
}
```

#### Errors
| Status | Condition |
|--------|-----------|
| 400 | Not in draft state |
| 400 | Validation failure |
| 403 | Missing permission |

---

### POST /Election/{id}/finalize

Transitions election from draft to finalized.

#### Authorization
- **Requires:** `canEditElectionState` permission (owner only)

#### Database Operations
- **Reads:** `electionDB`, `electionRollDB`
- **Writes:** `electionDB` (state = 'finalized')
- **Deletes:** `ballotDB WHERE election_id = ?` (all test ballots)

#### Preconditions
- Election must be in `draft` state
- For closed elections with email: voter roll must exist

#### Request
```
POST /API/Election/my-poll/finalize
```

#### Response (200 OK)
```json
{
  "election": {
    "state": "finalized",
    "..."
  }
}
```

---

### POST /Election/{id}/setOpenState

Manually opens or closes an election.

#### Authorization
- **Requires:** `canEditElectionState` permission (owner only)

#### Database Operations
- **Writes:** `electionDB` (state = 'open' or 'closed')

#### Preconditions
- Election must be in `open` or `closed` state
- Election must NOT have `start_time` or `end_time` set

#### Request
```json
{
  "open": true
}
```

#### Response (200 OK)
```json
{
  "election": {
    "state": "open",
    "..."
  }
}
```

#### Errors
| Status | Condition |
|--------|-----------|
| 400 | Has scheduled times |
| 400 | Wrong current state |

---

### POST /Election/{id}/archive

Archives an election.

#### Authorization
- **Requires:** `canEditElectionState` permission (owner only)

#### Database Operations
- **Writes:** `electionDB` (state = 'archived')

#### Preconditions
- Must not already be archived

#### Request
```
POST /API/Election/my-poll/archive
```

---

### DELETE /Election/{id}

Deletes an election.

#### Authorization
- **Requires:** `canDeleteElection` permission (owner only)

#### Database Operations
- **Deletes:** `electionDB WHERE election_id = ?`
- **Does NOT delete:** Associated ballots and rolls (become orphaned)

#### Response (200 OK)
```
"Election Deleted"
```

---

### PUT /Election/{id}/roles

Updates admin/auditor/credentialer assignments.

#### Authorization
- **Requires:** `canEditElectionRoles` permission (owner only)

#### Database Operations
- **Writes:** `electionDB` (admin_ids, audit_ids, credential_ids)

#### Request
```json
{
  "admin_ids": ["admin@example.com"],
  "audit_ids": ["auditor@example.com"],
  "credential_ids": ["cred@example.com"]
}
```

---

### POST /Election/{id}/claim

Claims ownership of a temp-user-created election.

#### Authorization
- **Requires:** `canClaimElection` permission (owner via temp_id)
- **Must be logged in**

#### Database Operations
- **Writes:** `electionDB` (owner_id = logged-in user's ID)

#### Request
```json
{
  "claim_key": "original-claim-key-from-creation"
}
```

#### Preconditions
- User must be logged in (not temp user)
- claim_key must hash to election's claim_key_hash

---

### GET /Elections

Lists all elections for the current user.

#### Authorization
- Returns different data based on login state

#### Database Operations
- **Reads:** `electionDB` (multiple queries)
- **Reads:** `electionRollDB` (for voter status)

#### Response (200 OK)
```json
{
  "elections_as_official": [/* elections user owns/administers */],
  "elections_as_unsubmitted_voter": [/* private elections user is invited to */],
  "elections_as_submitted_voter": [/* elections user has voted in */],
  "public_archive_elections": [/* archived public elections */],
  "open_elections": [/* currently open public elections */]
}
```

---

### POST /Election/{id}/setPublicResults

Toggles public results visibility.

#### Authorization
- **Requires:** `canEditElectionState` permission (owner only)

#### Request
```json
{
  "public_results": true
}
```

---

## Ballot Endpoints

### POST /Election/{id}/vote

Casts a vote.

#### Authorization
- **Voter authentication based on election settings**

#### Database Operations
- **Reads:** `electionDB`, `electionRollDB`, `ballotDB` (if ballot_updates)
- **Writes (async via queue):**
  - `ballotDB` (INSERT or UPDATE)
  - `electionRollDB` (submitted=true)

#### Preconditions
- Election state must be `open` or `draft`
- Voter must pass authentication checks
- Voter must be authorized (approved in roll)
- If already voted: `ballot_updates` must be enabled

#### Request
```json
{
  "ballot": {
    "election_id": "my-poll",
    "status": "submitted",
    "votes": [{
      "race_id": "lunch",
      "scores": [
        {"candidate_id": "pizza", "score": 5},
        {"candidate_id": "tacos", "score": 3}
      ]
    }]
  },
  "receiptEmail": "voter@example.com"
}
```

#### Response (200 OK)
```json
{
  "ballot": {
    "election_id": "my-poll",
    "status": "submitted",
    "votes": [...],
    "date_submitted": 1704067200000
  }
}
```

Note: `ballot_id` is NOT returned (prevents vote buying).

#### Errors
| Status | Condition |
|--------|-----------|
| 400 | Election not open |
| 400 | Already voted (no ballot_updates) |
| 400 | Invalid ballot (validation failure) |
| 401 | Missing authentication |
| 401 | Not authorized to vote |

---

### GET /Election/{id}/ballots

Retrieves all ballots (officials only).

#### Authorization
- **Requires:** `canViewBallots` permission
- **Requires:** `public_results=true` OR election `state=closed`

#### Database Operations
- **Reads:** `ballotDB WHERE election_id = ? AND head = true`

#### Response (200 OK)
```json
{
  "election": {...},
  "ballots": [
    {
      "ballot_id": "b-abc123",
      "election_id": "my-poll",
      "votes": [...],
      "precinct": "District A"
    }
  ]
}
```

Note: Identifying information (history, dates, user_id, ip_hash) is scrubbed.

---

### GET /Election/{id}/anonymizedBallots

Retrieves ballots for public analysis.

#### Authorization
- **Public if:** `public_results=true` OR `state=closed`
- **Otherwise:** `canViewBallots` permission required

#### Response (200 OK)
```json
{
  "ballots": [
    {
      "ballot_id": "b-abc123",
      "election_id": "my-poll",
      "votes": [...],
      "precinct": "District A"
    }
  ]
}
```

---

### DELETE /Election/{id}/ballots

Deletes all ballots (draft/public_archive only).

#### Authorization
- **Requires:** `canDeleteAllBallots` permission

#### Database Operations
- **Deletes:** `ballotDB WHERE election_id = ?`

#### Preconditions
- Election must be in `draft` state, OR
- Election must have `public_archive_id` set

---

### POST /Election/{id}/uploadBallots

Bulk uploads ballots (admin import).

#### Authorization
- **Requires:** `canUploadBallots` permission (owner only)

#### Database Operations
- **Reads:** `electionDB`, `electionRollDB`
- **Writes:** `ballotDB` (bulk INSERT)
- **Writes:** `electionRollDB` (submitted=true for each voter)

#### Request
```json
{
  "race_order": [
    {
      "race_id": "president",
      "candidate_id_order": ["alice", "bob", "charlie"]
    }
  ],
  "ballots": [
    {
      "voter_id": "voter-001",
      "ballot": {
        "orderedVotes": [[5, 3, 1, 0, false]]
      }
    }
  ]
}
```

The `orderedVotes` format: `[score1, score2, ..., overvote_rank, has_duplicate_rank]`

#### Response (200 OK)
```json
{
  "responses": [
    {"voter_id": "voter-001", "success": true, "message": "Success"},
    {"voter_id": "voter-002", "success": false, "message": "Error: ..."}
  ]
}
```

---

## Election Roll Endpoints

### POST /Election/{id}/rolls

Adds voters to the roll.

#### Authorization
- **Requires:** `canAddToElectionRoll` permission

#### Database Operations
- **Reads:** `electionRollDB` (duplicate check)
- **Writes:** `electionRollDB` (INSERT)

#### Request
```json
{
  "electionRoll": [
    {"email": "voter1@example.com", "precinct": "District A"},
    {"email": "voter2@example.com", "precinct": "District B"}
  ]
}
```

#### Errors
| Status | Condition |
|--------|-----------|
| 400 | Voters already exist |
| 400 | Exceeds voter limit |
| 400 | voter_id provided for email election |

---

### GET /Election/{id}/rolls

Gets all roll entries.

#### Authorization
- **Requires:** `canViewElectionRoll` permission
- **Blocked for:** `voter_access=open` elections

#### Database Operations
- **Reads:** `electionRollDB WHERE election_id = ? AND head = true`

#### Response (200 OK)
```json
{
  "election": {...},
  "electionRoll": [
    {
      "election_id": "my-poll",
      "email": "voter@example.com",
      "submitted": false,
      "state": "approved",
      "precinct": "District A",
      "history": [...]
    }
  ]
}
```

Note: `ballot_id`, `ip_hash`, and (for email elections) `voter_id` are scrubbed.

---

### POST /Election/{id}/register

Self-registration for registration-mode elections.

#### Authorization
- **Voter authentication based on settings**

#### Database Operations
- **Writes:** `electionRollDB` (INSERT with state='registered')

#### Preconditions
- Election state must be `open`
- `voter_access` must be `registration`

---

### POST /Election/{id}/rolls/approve

Approves a voter registration.

#### Authorization
- **Requires:** `canApproveElectionRoll` permission

#### Database Operations
- **Reads:** `electionRollDB`
- **Writes:** `electionRollDB` (state = 'approved')

#### Request
```json
{
  "electionRollEntry": {
    "voter_id": "v-abc123"
  }
}
```

#### Valid Source States
- `registered`
- `flagged`

---

### POST /Election/{id}/rolls/flag

Flags a voter for review.

#### Authorization
- **Requires:** `canFlagElectionRoll` permission

#### Valid Source States
- `approved`
- `registered`
- `invalid`

---

### POST /Election/{id}/rolls/invalidate

Invalidates a voter.

#### Authorization
- **Requires:** `canInvalidateBallot` permission (owner only)

#### Valid Source States
- `flagged` (must flag before invalidating)

---

### POST /Election/{id}/rolls/unflag

Moves invalid voter back to flagged.

#### Authorization
- **Requires:** `canInvalidateBallot` permission

#### Valid Source States
- `invalid`

---

### POST /Election/{id}/sendInvites

Sends email invitations to all uninvited voters.

#### Authorization
- **Requires:** `canSendEmails` permission

#### Database Operations
- **Reads:** `electionRollDB`
- **Writes (async):** `electionRollDB` (email_data updated)

#### Preconditions
- `voter_access = 'closed'`
- `invitation = 'email'`

---

### POST /Election/{id}/sendInvite/{voter_id}

Sends invitation to specific voter.

#### Authorization
- **Requires:** `canSendEmails` permission

---

### POST /Election/{id}/rolls/revealVoterId

🚨 **Emergency endpoint** - Reveals voter_id for an email.

#### Authorization
- **Requires:** `canViewElectionRoll` permission

#### Request
```json
{
  "email": "voter@example.com"
}
```

#### Response (200 OK)
```json
{
  "voter_id": "v-abc123def456",
  "email": "voter@example.com",
  "warning": "This action has been logged in the audit trail"
}
```

---

## Results & Statistics

### GET /ElectionResult/{id}

Calculates and returns election results.

#### Authorization
- **Public if:** `public_results=true` OR `state=closed`
- **Otherwise:** `canViewPreliminaryResults` permission required

#### Database Operations
- **Reads:** `electionDB`, `ballotDB`

#### Response (200 OK)
```json
{
  "election": {...},
  "results": [
    {
      "summaryData": {...},
      "voteCounts": {...},
      "rounds": [...],
      "winner": {"name": "Alice", "id": "alice"}
    }
  ]
}
```

---

### GET /GlobalElectionStats

Returns aggregate statistics.

#### Authorization
- **None required**

#### Database Operations
- **Reads:** `ballotDB` (counts)
- **Reads:** `electionDB` (counts)

#### Response (200 OK)
```json
{
  "elections": 1523,
  "votes": 87654
}
```

---

### POST /Sandbox

Calculates results for arbitrary ballot data.

#### Authorization
- **None required**

#### Request
```json
{
  "cvr": [[5,3,1], [1,3,5]],
  "candidates": ["Alice", "Bob", "Charlie"],
  "num_winners": 1,
  "votingMethod": "STAR"
}
```

---

## Utility Endpoints

### POST /images

Uploads an image to S3.

#### Authorization
- **None required**

#### Response (200 OK)
```json
{
  "photo_filename": "uploads/abc123.jpg"
}
```

---

### GET /

Health check.

#### Response (200 OK)
```
"19:40"
```

---

### POST /QueryElections

Admin query for elections by date range.

#### Authorization
- **Requires:** `canQueryElections` permission (system_admin)

#### Request
```json
{
  "start_time": "2024-01-01T00:00:00Z",
  "end_time": "2024-12-31T23:59:59Z"
}
```
