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

Authentication verifies the voter's identity based on election settings. This is one of the most complex parts of the system because different combinations of settings create very different behaviors.

### The Authentication Interface

The backend defines an `authentication` interface with several boolean flags:

```typescript
interface authentication {
    voter_id?: boolean;      // ACTIVE - Require voter ID or device tracking
    email?: boolean;         // ACTIVE - Require email authentication
    ip_address?: boolean;    // ACTIVE - Track IP for duplicate detection
    phone?: boolean;         // DEPRECATED - Not implemented
    address?: boolean;       // DEPRECATED - Not implemented  
    registration_data?: [registration_field];  // PARTIALLY IMPLEMENTED - For registration-mode elections
    registration_api_endpoint?: string;         // DEPRECATED - Not implemented
}
```

**Important:** Despite being in the interface, only `voter_id`, `email`, and `ip_address` are actively used. The others are legacy code that may be removed.

### Understanding voter_id (The Confusing One)

The `voter_id` flag behaves **completely differently** depending on `voter_access`:

#### voter_id + Closed Election (`voter_access='closed'`)

```
Meaning: "Voters must provide a pre-assigned voter ID"

How it works:
1. Admin creates election with voter list
2. Each voter gets a unique voter_id (auto-generated like "v-abc123def456")
3. Voters receive their voter_id via email invitation link
4. To vote, voter must have their voter_id in a browser cookie
5. Cookie is set automatically when visiting the invitation link
6. Cookie is base64-encoded to handle special characters

What the voter experiences:
- Click email link → voter_id set automatically → can vote
- OR enter voter_id manually on election page → can vote
- Without voter_id → "Voter ID Required" error
```

#### voter_id + Open Election (`voter_access='open'`)

```
Meaning: "One vote per logged-in user account"

How it works:
1. Voter must be logged in via Keycloak
2. Their Keycloak user ID (user.sub) is used as the voter_id
3. Roll entry created/looked up using this Keycloak ID
4. Same user can only vote once (tracked by their account)

What the voter experiences:
- Not logged in → "User ID Required" error
- Log in → can vote
- Try to vote again from same account → "Already voted"

This is essentially "one vote per device" but better named as 
"one vote per authenticated user account"
```

#### voter_id = false (regardless of voter_access)

```
Meaning: No voter identity tracking by ID

For open elections: A new roll entry with a random voter_id is 
created each time someone votes (unless email or ip_address 
tracking is enabled to identify returning voters).

For closed elections: Voters are identified by email instead
(requires invitation='email').
```

### Understanding email Authentication

```typescript
email?: boolean;  // Require email authentication
```

When `email=true`:
- Voter **must be logged in** via Keycloak with a verified email
- The email is stored on the roll entry
- Used to identify returning voters
- Combined with other auth methods for multi-factor

```
What the voter experiences:
- Not logged in → "Email Validation Required" error
- Logged in → email checked and stored → can vote
```

### Understanding ip_address Tracking

```typescript
ip_address?: boolean;  // Track IP for duplicate detection
```

When `ip_address=true`:
- Voter's IP address is hashed (SHA-256) and stored
- Used to **detect** potential duplicates, not strictly prevent them
- If returning voter has different IP → error (in some code paths)
- This is **tracking**, not hard enforcement

```
Behavior:
- First vote: IP hash stored on roll entry
- Same voter, same IP: Can vote (or update if ballot_updates enabled)
- Same voter, different IP: May get error "IP Address does not match"

Note: This is privacy-sensitive. IP is hashed before storage.
```

### The Authentication Settings Matrix

Here's what actually works and what each combination means:

| voter_access | voter_id | email | ip_address | Behavior |
|--------------|:--------:|:-----:|:----------:|----------|
| `open` | false | false | false | Anyone can vote, no tracking, unlimited votes possible |
| `open` | false | false | true | Anyone can vote, IP tracked for analytics/review |
| `open` | false | true | false | Must log in, email stored, one vote per email |
| `open` | true | false | false | Must log in, Keycloak ID used, one vote per account |
| `open` | true | true | false | Must log in, both email and account ID tracked |
| `open` | true | false | true | Must log in, account ID + IP tracked |
| `closed` | false | - | - | Voters identified by email (requires `invitation='email'`) |
| `closed` | true | false | false | Voters need assigned voter_id from invitation |
| `closed` | true | true | false | Voters need voter_id AND matching email |
| `closed` | true | false | true | Voters need voter_id, IP tracked |
| `registration` | - | true | - | Voter registers, admin approves, email required |

### Frontend UI Options

The frontend election creation wizard presents these as simpler options:

| UI Option | Internal Settings | Description |
|-----------|-------------------|-------------|
| "One vote per device" | `voter_id: true` | For open elections: requires login |
| "Email required" | `email: true` | Requires login with verified email |
| "IP tracking" | `ip_address: true` | Tracks IP address |
| "No limit" | `{}` (all false) | No authentication required |

### Where Each ID Comes From

| Scenario | voter_id Source | Format |
|----------|-----------------|--------|
| Closed + voter_id auth | Cookie `voter_id` | Base64-encoded, like `di1hYmMxMjM=` |
| Closed + voter_id in URL | URL param `/Election/{id}/{voter_id}` | Plain string like `v-abc123` |
| Open + voter_id auth | Keycloak JWT | UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| Open + no voter_id auth | Auto-generated | Random `v-{12 chars}` like `v-xyz789def012` |

### The Roll Entry Creation Decision Tree

When a voter submits a ballot, here's the detailed logic:

```
1. Check voter_access mode
   │
   ├─► voter_access = 'closed'
   │   │
   │   └─► Search for existing roll by:
   │       - voter_id (if voter_id auth enabled)
   │       - email (if email auth enabled)
   │       - ip_hash (if ip_address enabled)
   │       │
   │       ├─► Found: Use existing roll entry
   │       │   - Verify all enabled auth fields match
   │       │   - If mismatch → Unauthorized error
   │       │
   │       └─► Not found: Return null → "Not authorized to vote"
   │
   ├─► voter_access = 'open'
   │   │
   │   └─► Search for existing roll by enabled auth fields
   │       │
   │       ├─► Found: Use existing roll entry
   │       │   - Verify matches (see validation below)
   │       │
   │       └─► Not found: CREATE new roll entry
   │           - Generate new voter_id (or use user.sub if voter_id auth enabled)
   │           - Store email if available
   │           - Store ip_hash always
   │           - state = 'approved' (auto-approved for open elections)
   │
   └─► voter_access = 'registration'
       │
       └─► Voter must explicitly register first
           - Registration creates roll with state = 'registered'
           - Admin must approve → state = 'approved'
           - Then voter can vote
```

### Authentication Error Messages Explained

| Error | Trigger | Meaning | User Action |
|-------|---------|---------|-------------|
| "Voter ID Required" | `voter_id=true`, `voter_access='closed'`, no cookie | Closed election requiring pre-assigned ID | Enter voter ID or use invitation link |
| "User ID Required" | `voter_id=true`, `voter_access='open'`, not logged in | Open election requiring login for tracking | Log in to your account |
| "Email Validation Required" | `email=true`, user not logged in | Must log in with verified email | Log in |
| "IP Address does not match" | `ip_address=true`, different IP than roll entry | Returning voter from different IP | Use original device/network |
| "Email does not match" | `email=true`, logged-in email ≠ roll email | Wrong account | Log in with correct email |
| "Voter ID does not match" | `voter_id=true`, provided ID ≠ roll ID | Wrong voter ID | Use correct voter ID |

### Code Flow: checkForMissingAuthenticationData

This function runs **before** roll lookup to ensure the voter has provided required data:

```typescript
export function checkForMissingAuthenticationData(req, election, ctx, voter_id_override?) {
    // For CLOSED elections with voter_id auth:
    // Check for voter_id in cookies (or override from URL param)
    if (election.settings.voter_authentication.voter_id && 
        election.settings.voter_access == 'closed') {
        if (!(voter_id_override ?? req.cookies?.voter_id)) {
            return 'Voter ID Required';
        }
    }
    
    // For OPEN elections with voter_id auth:
    // User must be logged in (we'll use their Keycloak ID)
    if (election.settings.voter_authentication.voter_id && 
        election.settings.voter_access == 'open') {
        if (!req.user) {
            return 'User ID Required';
        }
    }
    
    // For ANY election with email auth:
    // User must be logged in with verified email
    if (election.settings.voter_authentication.email) {
        if (!req.user?.email) {
            return 'Email Validation Required';
        }
    }
    
    return null;  // All required data present
}
```

### Code Flow: getOrCreateElectionRoll

After authentication check passes, this function finds or creates the roll entry:

```typescript
export async function getOrCreateElectionRoll(req, election, ctx, voter_id_override?, skipStateCheck?) {
    // Always compute IP hash (may or may not be used)
    const ip_hash = hashString(req.ip);
    
    // Only use these for lookup if the corresponding auth is enabled
    const require_ip_hash = election.settings.voter_authentication.ip_address ? ip_hash : null;
    const email = election.settings.voter_authentication.email ? req.user?.email : null;
    
    // voter_id lookup depends on voter_access mode
    let voter_id = null;
    if (election.settings.voter_authentication.voter_id) {
        if (election.settings.voter_access == 'closed') {
            // Get from cookie (base64 decoded) or URL override
            voter_id = voter_id_override ?? atob(req.cookies?.voter_id);
        } else {
            // Open election: use Keycloak user ID
            voter_id = voter_id_override ?? req.user?.sub;
        }
    }
    
    // Search for existing roll entry matching ANY enabled auth field
    // This is intentionally broad - we then validate all fields match
    let entries = null;
    if (require_ip_hash || email || voter_id) {
        entries = await ElectionRollModel.getElectionRoll(
            election.election_id, voter_id, email, require_ip_hash
        );
    }
    
    if (entries == null) {
        // No existing roll found
        
        // Closed elections: must have pre-existing roll
        if (election.settings.voter_access !== 'open') {
            return null;  // Will result in "Not authorized to vote"
        }
        
        // Open elections: create new roll entry
        const new_voter_id = election.settings.voter_authentication.voter_id 
            ? voter_id  // Use the Keycloak ID
            : await makeUniqueID('v-', 12, checkExists);  // Generate random
        
        const roll = {
            election_id: election.election_id,
            voter_id: new_voter_id,
            email: req.user?.email,  // Store if available
            ip_hash: ip_hash,        // Always store for open elections
            submitted: false,
            state: 'approved',       // Auto-approved for open
            // ... history, dates, etc.
        };
        
        // Save to database (unless no auth fields enabled - then it's ephemeral)
        if (require_ip_hash || email || voter_id) {
            await ElectionRollModel.submitElectionRoll([roll]);
        }
        
        return roll;
    }
    
    // Found existing roll - validate ALL enabled auth fields match
    if (election.settings.voter_authentication.ip_address && entries[0].ip_hash) {
        if (entries[0].ip_hash !== ip_hash) {
            throw new Unauthorized('IP Address does not match saved voter roll');
        }
    }
    if (election.settings.voter_authentication.email && entries[0].email !== email) {
        throw new Unauthorized('Email does not match saved election roll');
    }
    if (election.settings.voter_authentication.voter_id && 
        entries[0].voter_id.trim() !== voter_id.trim()) {
        throw new Unauthorized('Voter ID does not match saved voter roll');
    }
    
    return entries[0];
}
```

---

## Voter Authorization

After authentication passes, the system determines if the voter is authorized to cast a ballot.

### The Authorization Check

The `getVoterAuthorization` function combines authentication and roll status:

```typescript
function getVoterAuthorization(roll, missingAuthData) {
    // If authentication data was missing, not authorized
    if (missingAuthData !== null) {
        return {
            authorized_voter: false,
            required: missingAuthData,  // e.g., "Voter ID Required"
            has_voted: false
        };
    }
    
    // If no roll entry found, not authorized
    if (roll === null) {
        return {
            authorized_voter: false,
            has_voted: false
        };
    }
    
    // Roll found and auth passed - authorized
    return {
        authorized_voter: true,
        has_voted: roll.submitted  // Important for ballot_updates check
    };
}
```

### The Vote Permission Check

```typescript
function assertVoterMayVote(voterAuth, election, ctx) {
    if (voterAuth.authorized_voter === false) {
        throw new Unauthorized("User not authorized to vote");
    }
    
    // Can only vote again if ballot_updates is enabled
    if (voterAuth.has_voted === true && 
        election.settings.ballot_updates !== true) {
        throw new BadRequest("User has already voted");
    }
}
```

### Authorization Scenarios Summary

| Scenario | Roll Lookup | Auth Check | Can Vote? |
|----------|-------------|------------|:---------:|
| Open election, first-time voter | Creates new roll | Passes | ✓ |
| Open election, returning (same auth) | Finds existing roll | Passes | ✓ (or update) |
| Open election, returning (different auth) | May find wrong/no roll | May fail | ? |
| Closed election, voter_id in roll | Finds roll by voter_id | Passes | ✓ |
| Closed election, voter_id NOT in roll | No roll found | N/A | ✗ |
| Registration election, pending approval | Finds roll, state='registered' | Passes but state check fails | ✗ |
| Already voted, ballot_updates=false | Finds roll, submitted=true | Already voted check fails | ✗ |
| Already voted, ballot_updates=true | Finds roll, submitted=true | Passes | ✓ (update) |

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
