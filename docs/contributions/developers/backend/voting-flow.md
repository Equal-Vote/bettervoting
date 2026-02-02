---
layout: default
title: 🗳️ Voting Flow
nav_order: 4
parent: 🔧 Backend Developer Guide
grand_parent: 💻 Developers
---

# Voting Flow

This document explains everything about casting votes: when voting is allowed, how voters are authenticated, what validation occurs, and how votes are processed.

---

## Table of Contents

1. [Overview](#overview)
2. [When Can You Vote?](#when-can-you-vote)
3. [Voter Authentication](#voter-authentication)
4. [Voter Authorization](#voter-authorization)
5. [Ballot Validation](#ballot-validation)
6. [Vote Processing](#vote-processing)
7. [Ballot Updates](#ballot-updates)
8. [Vote Receipts](#vote-receipts)
9. [Bulk Ballot Upload](#bulk-ballot-upload)
10. [Common Errors](#common-errors)

---

## Overview

The voting flow involves several layers of checks:

```
Voter submits ballot
        │
        ▼
┌───────────────────┐
│ Election State    │ ─── Is election open or draft?
│ Check             │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Authentication    │ ─── Does voter have required credentials?
│ Check             │     (voter_id, email, etc.)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Roll Lookup       │ ─── Find or create voter's roll entry
│                   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Authorization     │ ─── Is voter approved? Already voted?
│ Check             │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Ballot            │ ─── Valid races? Valid scores?
│ Validation        │     No duplicate votes?
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Queue Vote        │ ─── Add to pg-boss job queue
│                   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Process           │ ─── Save ballot, update roll,
│ (async)           │     send receipt email
└───────────────────┘
```

---

## When Can You Vote?

### Election State Requirements

Voting is only allowed when:

```typescript
if (election.state !== 'open' && election.state !== 'draft') {
    throw new BadRequest("Election is not open");
}
```

| State | Voting Allowed | Notes |
|-------|:--------------:|-------|
| `draft` | ✓ | Test votes only (deleted on finalize) |
| `finalized` | No | Waiting for start |
| `open` | ✓ | Normal voting |
| `closed` | No | Voting ended |
| `archived` | No | Historical only |

### Prior Election Exception

Elections with `ballot_source='prior_election'` skip voter roll and validation checks entirely - they're just importing historical data.

> **Security Note:** This bypass is intentional for admin-uploaded historical data. The `ballot_source` field is server-controlled and cannot be set by clients. Prior elections still require `canUploadBallots` permission (owner/system_admin only).

---

## Voter Authentication

Authentication verifies the voter's identity based on election settings.

### Authentication Settings

The `election.settings.voter_authentication` object controls what's required:

```typescript
interface Authentication {
    voter_id?:   boolean;  // Require voter ID
    email?:      boolean;  // Require email
    ip_address?: boolean;  // Track IP
}
```

### Authentication Checks

```typescript
function checkForMissingAuthenticationData(req, election, ctx, voter_id_override?) {
    const settings = election.settings;
    
    // Voter ID check for closed elections
    if (settings.voter_authentication.voter_id && 
        settings.voter_access == 'closed') {
        if (!voter_id_override && !req.cookies?.voter_id) {
            return 'Voter ID Required';
        }
    }
    
    // Voter ID check for open elections (requires login)
    if (settings.voter_authentication.voter_id && 
        settings.voter_access == 'open') {
        if (!req.user) {
            return 'User ID Required';
        }
    }
    
    // Email check (requires login with email)
    if (settings.voter_authentication.email) {
        if (!req.user?.email) {
            return 'Email Validation Required';
        }
    }
    
    return null; // All checks passed
}
```

### Where Credentials Come From

| Credential | Source | Format |
|------------|--------|--------|
| `voter_id` (closed) | Cookie | Base64-encoded string in `voter_id` cookie |
| `voter_id` (open) | Keycloak | `user.sub` from JWT |
| `email` | Keycloak | `user.email` from JWT |
| `ip_hash` | Request | `hashString(req.ip)` |

### Authentication Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Voter ID Required" | Closed election, no voter_id cookie | Enter voter ID on election page |
| "User ID Required" | Open election with voter_id auth, not logged in | Log in |
| "Email Validation Required" | Email auth required, not logged in | Log in with email |

---

## Voter Authorization

After authentication, the system checks if the voter is authorized to vote.

### Roll Lookup

```typescript
async function getOrCreateElectionRoll(req, election, ctx, voter_id_override?, skipStateCheck?) {
    const ip_hash = hashString(req.ip);
    
    // Determine what identifiers to search for
    const require_ip = election.settings.voter_authentication.ip_address ? ip_hash : null;
    const email = election.settings.voter_authentication.email ? req.user?.email : null;
    let voter_id = null;
    
    if (election.settings.voter_authentication.voter_id) {
        if (election.settings.voter_access == 'closed') {
            voter_id = voter_id_override ?? atob(req.cookies?.voter_id);
        } else {
            voter_id = voter_id_override ?? req.user?.sub;
        }
    }
    
    // Search for existing roll entry
    const entries = await ElectionRollModel.getElectionRoll(
        election.election_id, voter_id, email, require_ip
    );
    
    if (entries == null) {
        // No match found
        if (election.settings.voter_access !== 'open') {
            return null; // Closed elections require pre-registration
        }
        if (!skipStateCheck && election.state !== 'open') {
            return null; // Can't create during finalized
        }
        // Create new roll entry for open election
        return createNewRollEntry(...);
    }
    
    // Validate matches (IP, email, voter_id consistency)
    validateRollEntry(entries[0], ip_hash, email, voter_id);
    
    return entries[0];
}
```

### Authorization Determination

```typescript
function getVoterAuthorization(roll, missingAuthData) {
    if (missingAuthData !== null) {
        return {
            authorized_voter: false,
            required: missingAuthData,
            has_voted: false
        };
    }
    
    if (roll === null) {
        return {
            authorized_voter: false,
            has_voted: false
        };
    }
    
    return {
        authorized_voter: true,
        has_voted: roll.submitted
    };
}
```

### Vote Permission Check

```typescript
function assertVoterMayVote(voterAuth, election, ctx) {
    if (voterAuth.authorized_voter === false) {
        throw new Unauthorized("User not authorized to vote");
    }
    
    if (voterAuth.has_voted === true && 
        election.settings.ballot_updates !== true) {
        throw new BadRequest("User has already voted");
    }
}
```

### Authorization Scenarios

| Scenario | Result |
|----------|--------|
| Open election, new voter | Create roll entry, authorized |
| Open election, returning voter | Find roll entry, authorized |
| Closed election, voter in roll | Find roll entry, authorized |
| Closed election, voter NOT in roll | No roll entry, NOT authorized |
| Registration election, not approved | Roll entry found but state != approved, NOT authorized |
| Already voted, no ballot_updates | has_voted=true, NOT authorized |
| Already voted, ballot_updates=true | has_voted=true, authorized (can update) |

---

## Ballot Validation

After authorization, the ballot itself is validated.

### Validation Function

```typescript
function ballotValidation(election, ballot): string | null {
    if (!ballot) {
        return "Ballot is null";
    }
    
    if (!ballot.election_id || typeof ballot.election_id !== 'string') {
        return `Invalid Election ID ${ballot.election_id}`;
    }
    
    if (!ballot.votes) {
        return "Invalid Votes";
    }
    
    // Get races voter can vote in (precinct filtering)
    const approvedRaces = getApprovedRaces(election, ballot.precinct);
    const approvedRaceIds = approvedRaces.map(race => race.race_id);
    const ballotRaceIds = ballot.votes.map(vote => vote.race_id);
    
    // Check for duplicate votes
    if (new Set(ballotRaceIds).size !== ballotRaceIds.length) {
        return "Duplicate votes";
    }
    
    // Check all races are valid
    const validIds = ballotRaceIds.every(id => approvedRaceIds.includes(id));
    if (!validIds) {
        return "Invalid IDs";
    }
    
    // Check scores are in valid range
    let outOfBoundsError = '';
    ballot.votes.forEach(vote => {
        const race = approvedRaces.find(r => r.race_id === vote.race_id);
        
        if (['RankedRobin', 'IRV', 'STV'].includes(race.voting_method)) {
            // Ranked: scores must be 1 to max_rankings (or num_candidates)
            vote.scores.forEach(score => {
                if (score.score > (election.settings.max_rankings || Infinity) ||
                    score.score < 0) {
                    outOfBoundsError += `Race: ${race.title}, Score: ${score.score}; `;
                }
            });
        }
        else if (['STAR', 'STAR_PR'].includes(race.voting_method)) {
            // STAR: scores must be 0-5
            vote.scores.forEach(score => {
                if (score.score > 5 || score.score < 0) {
                    outOfBoundsError += `Race: ${race.title}, Score: ${score.score}; `;
                }
            });
        }
        else if (['Approval', 'Plurality'].includes(race.voting_method)) {
            // Approval/Plurality: scores must be 0-1
            vote.scores.forEach(score => {
                if (score.score > 1 || score.score < 0) {
                    outOfBoundsError += `Race: ${race.title}, Score: ${score.score}; `;
                }
            });
        }
    });
    
    if (outOfBoundsError) {
        return "Scores out of bounds: " + outOfBoundsError;
    }
    
    return null; // Valid
}
```

### Score Ranges by Voting Method

| Method | Valid Range | Example |
|--------|-------------|---------|
| STAR | 0-5 | Give 5 to favorite, 0 to least favorite |
| STAR_PR | 0-5 | Same as STAR |
| Approval | 0-1 | 1 = approve, 0 = don't approve |
| Plurality | 0-1 | 1 = vote for, 0 = don't vote for |
| IRV | 1 to max | 1 = first choice, 2 = second, etc. |
| STV | 1 to max | Same as IRV |
| RankedRobin | 1 to max | Same as IRV |

### Precinct Filtering

Voters only see races matching their precinct:

```typescript
function getApprovedRaces(election, voterPrecinct) {
    return election.races.filter(race => {
        // No precincts defined = open to all
        if (!race.precincts) return true;
        
        // Voter's precinct must be in race's precinct list
        if (voterPrecinct && race.precincts.includes(voterPrecinct)) return true;
        
        // Mismatch = not approved for this race
        return false;
    });
}
```

---

## Vote Processing

### Queue-Based Processing

Votes are processed via pg-boss job queue to handle concurrency:

```typescript
const castVoteEventQueue = "castVoteEvent";

// Submit vote
await EventQueue.publish(castVoteEventQueue, {
    requestId: req.contextId,
    inputBallot: ballot,
    roll: rollEntry,
    userEmail: email,
    isBallotUpdate: !!existingBallot
});
```

### Event Handler

```typescript
async function handleCastVoteEvent(job) {
    const event = job.data;
    const ctx = Logger.createContext(event.requestId);
    
    let savedBallot;
    
    if (event.isBallotUpdate) {
        // Update existing ballot
        savedBallot = await BallotModel.updateBallot(event.inputBallot, ctx);
    } else {
        // Check if ballot already exists (idempotency)
        savedBallot = await BallotModel.getBallotByID(event.inputBallot.ballot_id, ctx);
        if (!savedBallot) {
            savedBallot = await BallotModel.submitBallot(event.inputBallot, ctx);
        }
    }
    
    // Update roll entry
    if (event.roll != null) {
        await ElectionRollModel.update(event.roll, ctx);
    }
    
    // Send receipt email
    if (event.userEmail) {
        const election = await ElectionsModel.getElectionByID(event.inputBallot.election_id);
        const receipt = Receipt(election, event.userEmail, savedBallot);
        await EmailService.sendEmails([receipt]);
    }
}
```

### Database Operations

**Reads from:**
- `electionDB` - Get election settings
- `electionRollDB` - Find voter's roll entry
- `ballotDB` - Check for existing ballot (ballot_updates)

**Writes to:**
- `ballotDB` - Insert/update ballot
- `electionRollDB` - Update submitted flag, add history

### Ballot Record Structure

```typescript
// Saved to ballotDB:
{
    ballot_id: "b-abc123",  // Auto-generated
    election_id: "my-election",
    user_id: "keycloak-uuid",  // If logged in
    status: "submitted",
    date_submitted: 1704067200000,  // Date.now()
    ip_hash: "sha256...",  // If ip_address tracking enabled
    votes: [{
        race_id: "president",
        scores: [
            { candidate_id: "alice", score: 5 },
            { candidate_id: "bob", score: 3 }
        ]
    }],
    history: [{
        action_type: "submitted_via_browser",
        actor: "v-abc123",  // voter_id
        timestamp: 1704067200000
    }],
    precinct: "district-1",
    create_date: "2024-01-01T00:00:00Z",
    update_date: "1704067200000",
    head: true
}
```

### Roll Record Update

```typescript
// Updated in electionRollDB:
{
    voter_id: "v-abc123",
    election_id: "my-election",
    submitted: true,  // <-- Key change
    ballot_id: "b-abc123",
    history: [
        { action_type: "added", actor: "admin@example.com", timestamp: ... },
        { action_type: "submit", actor: "v-abc123", timestamp: ... }  // <-- Added
    ]
}
```

---

## Ballot Updates

When `ballot_updates=true`, voters can change their vote.

### How Updates Work

1. Voter submits new ballot
2. System finds existing ballot by voter_id
3. Old ballot marked `head=false`
4. New ballot inserted with `head=true`
5. Roll history updated with "update" action

```typescript
if (election.settings.ballot_updates && election.state !== 'draft') {
    const existingBallot = await BallotModel.getBallotByVoterID(
        roll.voter_id, election_id
    );
    if (existingBallot) {
        // Mark event as update, use same ballot_id
        event.isBallotUpdate = true;
        ballot.ballot_id = existingBallot.ballot_id;
    }
}
```

### Update vs New Ballot

| Field | New Ballot | Update |
|-------|------------|--------|
| `ballot_id` | New UUID | Same as original |
| Old version | N/A | `head` set to `false` |
| History | `submitted_via_browser` | `update` |

### Restrictions

Ballot updates require:
- `voter_access = 'closed'`
- `invitation = 'email'`
- `public_results = false` (while open)

Why? Updates need a way to identify returning voters, and showing live results with updates enabled would allow vote buying.

---

## Vote Receipts

### When Receipts are Sent

If an email is available:

```typescript
event.userEmail = 
    event.roll?.email ??              // From roll entry
    AccountService.extractUserFromRequest(req).email ??  // From login
    req.body.receiptEmail;            // Provided in request
```

### Receipt Content

```typescript
// From EmailTemplates.ts:
Receipt(election, email, ballot, url, roll) {
    return {
        to: email,
        subject: `Vote Receipt for ${election.title}`,
        html: `
            Thank you for voting in ${election.title}!
            
            Your ballot ID: [hidden for security]
            Submitted at: ${ballot.date_submitted}
            
            [Vote summary based on races and scores]
        `
    };
}
```

### Security Note

The ballot_id is NOT included in receipts to prevent:
- Vote selling (can't prove how you voted)
- Coercion (can't show receipt to someone)

---

## Bulk Ballot Upload

Administrators can upload ballots in bulk for prior elections.

### API Endpoint

```
POST /API/Election/{id}/uploadBallots
```

### Request Format

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
        "orderedVotes": [[5, 3, 1]]
      }
    }
  ]
}
```

### Processing

```typescript
// For each ballot:
const newBallot = mapOrderedNewBallot(ballot, raceOrder);
// Converts [5, 3, 1] to [{candidate_id: "alice", score: 5}, ...]

const event = await makeBallotEvent(req, election, newBallot, 'submitted_via_admin');

// For prior_election: bypass queue, bulk insert
if (election.ballot_source == 'prior_election') {
    await BallotModel.bulkSubmitBallots(events.map(e => e.inputBallot));
}
```

### Audit Trail

Admin uploads record the admin's username:

```typescript
history: [{
    action_type: 'submitted_via_admin',
    actor: req.user.username,  // Admin who uploaded
    timestamp: Date.now()
}]
```

---

## Common Errors

### Error Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Election is not open" | Voting in wrong state | Wait for election to open |
| "Voter ID Required" | Missing voter_id cookie | Enter voter ID |
| "User ID Required" | Not logged in (open + voter_id auth) | Log in |
| "Email Validation Required" | Not logged in (email auth) | Log in with email |
| "User not authorized to vote" | Roll state not approved | Contact admin |
| "User has already voted" | Voted + no ballot_updates | Cannot vote again |
| "Invalid Ballot: Duplicate votes" | Same race voted twice | Fix ballot |
| "Invalid Ballot: Invalid IDs" | Wrong race_id or not in precinct | Check races |
| "Scores out of bounds" | Score outside valid range | Check voting method limits |
| "IP Address does not match" | Different device than registration | Use original device |
| "Email does not match" | Email doesn't match roll | Use correct email |

### Debugging Tips

1. **Check election state**: Is it actually `open`?
2. **Check authentication settings**: What's required?
3. **Check roll entry**: Does voter have an entry? What state?
4. **Check precinct**: Is voter seeing the right races?
5. **Check scores**: Are they in valid range for the method?
