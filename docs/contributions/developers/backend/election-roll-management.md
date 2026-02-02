---
layout: default
title: 👥 Election Roll Management
nav_order: 5
parent: 🔧 Backend Developer Guide
grand_parent: 💻 Developers
---

# Election Roll Management

This document explains the voter roll system: how voters are added, approved, managed, and tracked throughout the election.

---

## Table of Contents

1. [What is the Election Roll?](#what-is-the-election-roll)
2. [Roll Entry States](#roll-entry-states)
3. [Creating Roll Entries](#creating-roll-entries)
4. [Adding Voters Manually](#adding-voters-manually)
5. [Self-Registration](#self-registration)
6. [Approval Workflow](#approval-workflow)
7. [Flagging and Review](#flagging-and-review)
8. [Invalidation](#invalidation)
9. [Sending Invitations](#sending-invitations)
10. [Viewing the Roll](#viewing-the-roll)
11. [Emergency Access](#emergency-access)

---

## What is the Election Roll?

The Election Roll (stored in `electionRollDB`) is the voter registry for an election. It tracks:

- **Who can vote**: List of authorized voters
- **Who has voted**: Submission status
- **Authentication data**: Email, voter ID, IP hash
- **Approval status**: Whether voter is approved to participate
- **History**: All actions taken on each entry

### When is a Roll Used?

| Voter Access | Roll Usage |
|--------------|------------|
| `open` | Roll entries created dynamically when voters access election |
| `closed` | Roll must be pre-populated by admin; only listed voters can vote |
| `registration` | Roll entries created when voters register; admin approves before voting |

### Roll Entry Structure

```typescript
interface ElectionRoll {
    voter_id:      string;      // Unique within election
    election_id:   string;      // Which election
    email?:        string;      // For email-based auth/invitations
    submitted:     boolean;     // Has cast ballot?
    ballot_id?:    string;      // Reference to ballot (if voted)
    ip_hash?:      string;      // Hashed IP address
    state:         'approved' | 'flagged' | 'registered' | 'invalid';
    history?:      ElectionRollAction[];
    registration?: any;         // Custom registration data
    precinct?:     string;      // For precinct filtering
    email_data?:   EmailData;   // Invitation/reminder status
}
```

---

## Roll Entry States

Each roll entry has a state that determines if the voter can participate:

```
                          approve()
┌─────────────┐         ┌───────────┐
│ registered  │ ───────►│ approved  │◄───── Created directly
└─────────────┘         └───────────┘       (admin add, open election)
      │                       │
      │ flag()                │ flag()
      ▼                       ▼
┌─────────────┐  unflag() ┌───────────┐
│   flagged   │◄──────────│  flagged  │
└─────────────┘           └───────────┘
      │                       │
      │ invalidate()          │ invalidate()
      ▼                       ▼
┌─────────────┐          ┌───────────┐
│   invalid   │          │  invalid  │
└─────────────┘          └───────────┘
```

### State Descriptions

| State | Can Vote | Description |
|-------|:--------:|-------------|
| `approved` | ✓ | Voter is authorized to cast a ballot |
| `registered` | No | Voter has self-registered but awaits admin approval |
| `flagged` | No | Entry flagged for review (suspicious or needs verification) |
| `invalid` | No | Entry has been invalidated (banned from voting) |

### State Transition Permissions

| Transition | Required Permission |
|------------|---------------------|
| registered → approved | `canApproveElectionRoll` |
| flagged → approved | `canApproveElectionRoll` |
| any → flagged | `canFlagElectionRoll` |
| flagged → invalid | `canInvalidateBallot` |
| invalid → flagged | `canInvalidateBallot` (unflag) |

---

## Creating Roll Entries

### Automatic Creation (Open Elections)

For `voter_access='open'`, entries are created when voters first access the election:

```typescript
// In getOrCreateElectionRoll():
if (existingEntries == null && election.settings.voter_access === 'open') {
    const newEntry = {
        voter_id: await makeUniqueID('v-', 12, checkExists),
        election_id: election.election_id,
        email: req.user?.email,
        ip_hash: hashString(req.ip),
        submitted: false,
        state: 'approved',  // Auto-approved for open elections
        history: [{
            action_type: 'approved',
            actor: voter_id,
            timestamp: Date.now()
        }]
    };
    await ElectionRollModel.submitElectionRoll([newEntry]);
    return newEntry;
}
```

### Manual Creation (Closed Elections)

For `voter_access='closed'`, admins must add voters before the election.

---

## Adding Voters Manually

### API Endpoint

```
POST /API/Election/{id}/rolls
```

### Authorization

Requires `canAddToElectionRoll` permission:
- `system_admin`
- `owner`
- `admin`

### Request Body

```json
{
  "electionRoll": [
    {
      "email": "voter1@example.com",
      "precinct": "District A"
    },
    {
      "email": "voter2@example.com",
      "precinct": "District B"
    }
  ]
}
```

### What Happens

```typescript
const addElectionRoll = async (req, res, next) => {
    expectPermission(req.user_auth.roles, permissions.canAddToElectionRoll);
    
    // Filter empty entries
    const entries = req.body.electionRoll.filter(e => 
        e.voter_id?.trim() || e.email?.trim() || e.precinct?.trim()
    );
    
    // For email invitations, don't allow custom voter_ids
    if (election.settings.invitation === 'email') {
        if (entries.some(e => e.voter_id)) {
            throw new BadRequest("Cannot use voter_ids with email invitations");
        }
    }
    
    // Generate voter_ids if not provided
    const voterIds = await Promise.all(
        entries.map(e => e.voter_id || makeUniqueID('v-', 12, checkExists))
    );
    
    // Check for duplicates
    const existingRolls = await ElectionRollModel.getRollsByElectionID(election_id);
    const duplicates = entries.filter(e => 
        existingRolls.some(existing => 
            (existing.email === e.email) || (existing.voter_id === e.voter_id)
        )
    );
    if (duplicates.length > 0) {
        throw new BadRequest(`Voters already exist: ${duplicates.map(d => d.email).join(',')}`);
    }
    
    // Check voter limit
    const voterLimit = ELECTION_VOTER_LIMIT_OVERRIDES[election_id] ?? 50;
    if (election.settings.voter_access === 'closed' && 
        existingRolls.length + entries.length > voterLimit) {
        throw new BadRequest(`Election limited to ${voterLimit} voters`);
    }
    
    // Create entries (all approved by default)
    const rolls = entries.map((e, i) => ({
        voter_id: voterIds[i],
        election_id: election.election_id,
        email: e.email,
        precinct: e.precinct,
        submitted: false,
        state: 'approved',
        history: [{
            action_type: 'added',
            actor: req.user.email,
            timestamp: Date.now()
        }]
    }));
    
    await ElectionRollModel.submitElectionRoll(rolls);
};
```

### Database Operations

**Reads from:** `electionRollDB` (duplicate check)
**Writes to:** `electionRollDB`

### Voter Limits

| Election Type | Default Limit | Override |
|---------------|---------------|----------|
| Closed (private) | 50 voters | `ELECTION_VOTER_LIMIT_OVERRIDES[election_id]` |
| Open | No limit | N/A |

### Voter ID Generation

For email-based elections, voter_ids are auto-generated:
- Format: `v-{12 random chars}`
- Example: `v-abc123def456`
- Guaranteed unique within election

---

## Self-Registration

### When Used

For `voter_access='registration'` elections where voters register themselves.

### API Endpoint

```
POST /API/Election/{id}/register
```

### Flow

1. Voter visits election page
2. Voter fills registration form (custom fields in `registration_data`)
3. System creates roll entry with `state='registered'`
4. Admin reviews and approves/flags

### What Happens

```typescript
const registerVoter = async (req, res, next) => {
    // Check election is open
    if (election.state !== 'open') {
        throw new BadRequest("Election is not open");
    }
    
    // Check registration is allowed
    if (election.settings.voter_access !== 'registration') {
        throw new BadRequest("Registration not allowed");
    }
    
    // Check authentication requirements
    const missingAuth = checkForMissingAuthenticationData(req, election);
    if (missingAuth) {
        throw new Unauthorized(missingAuth);
    }
    
    // Check for existing entry
    let existingRoll = await getOrCreateElectionRoll(req, election);
    
    // Create or update entry
    const roll = existingRoll || {
        voter_id: await makeUniqueID('v-', 12, checkExists),
        election_id: election.election_id,
        email: req.user?.email,
        ip_hash: election.settings.voter_authentication.ip_address 
            ? hashString(req.ip) : undefined,
        submitted: false,
        state: 'registered',  // Pending approval
        registration: req.body.registration,  // Custom form data
        history: []
    };
    
    roll.history.push({
        action_type: 'registered',
        actor: req.user.email,
        timestamp: Date.now()
    });
    
    await ElectionRollModel.submitElectionRoll([roll]);
};
```

### Registration Data

The `registration` field stores custom form data:

```json
{
  "registration": {
    "full_name": "Jane Doe",
    "member_id": "12345",
    "photo": "uploads/id-photo-123.jpg"
  }
}
```

This is defined by `election.settings.voter_authentication.registration_data`:

```json
{
  "registration_data": [
    { "field_name": "full_name", "field_type": "text" },
    { "field_name": "member_id", "field_type": "text" },
    { "field_name": "photo", "field_type": "photo", "help_text": "Upload ID photo" }
  ]
}
```

---

## Approval Workflow

### Approving a Voter

```
POST /API/Election/{id}/rolls/approve
```

**Required Permission:** `canApproveElectionRoll` (owner, admin, credentialer)

**Request:**
```json
{
  "electionRollEntry": {
    "voter_id": "v-abc123"
  }
}
```

**What Happens:**

```typescript
const approveElectionRoll = async (req, res, next) => {
    expectPermission(req.user_auth.roles, permissions.canApproveElectionRoll);
    
    // Valid from: registered, flagged
    changeElectionRollState(
        req,
        'approved',
        ['registered', 'flagged'],  // Valid source states
        permissions.canApproveElectionRoll
    );
};

const changeElectionRollState = async (req, newState, validStates, permission) => {
    const roll = await ElectionRollModel.getByVoterID(
        election.election_id, 
        req.body.electionRollEntry.voter_id
    );
    
    if (!validStates.includes(roll.state)) {
        throw new Unauthorized("Invalid state transition");
    }
    
    roll.state = newState;
    roll.history.push({
        action_type: newState,
        actor: req.user.email,
        timestamp: Date.now()
    });
    
    await ElectionRollModel.update(roll);
};
```

### Approval Workflow for Registration Elections

```
1. Voter registers
   └── state = 'registered'

2. Admin reviews registration data
   ├── If valid: approve() → state = 'approved'
   └── If suspicious: flag() → state = 'flagged'

3. If flagged, admin can:
   ├── approve() → state = 'approved' (verified)
   └── invalidate() → state = 'invalid' (rejected)

4. Once approved, voter can vote
```

---

## Flagging and Review

### Flagging a Voter

```
POST /API/Election/{id}/rolls/flag
```

**Required Permission:** `canFlagElectionRoll` (all official roles)

**What it Does:**
- Marks entry for review
- Voter cannot vote while flagged
- Creates audit trail

```typescript
const flagElectionRoll = async (req, res, next) => {
    expectPermission(req.user_auth.roles, permissions.canFlagElectionRoll);
    
    changeElectionRollState(
        req,
        'flagged',
        ['approved', 'registered', 'invalid'],  // Can flag from any state except flagged
        permissions.canFlagElectionRoll
    );
};
```

### When to Flag

- Suspicious registration data
- Potential duplicate voter
- Identity verification needed
- Reported irregularity

### Unflagging

```
POST /API/Election/{id}/rolls/unflag
```

Changes `invalid` back to `flagged` for re-review. Only owner/admin can unflag.

---

## Invalidation

### Invalidating a Voter

```
POST /API/Election/{id}/rolls/invalidate
```

**Required Permission:** `canInvalidateBallot` (owner only)

**What it Does:**
- Permanently marks voter as invalid
- Voter cannot vote
- Can only invalidate from `flagged` state (must flag first)

```typescript
const invalidateElectionRoll = async (req, res, next) => {
    expectPermission(req.user_auth.roles, permissions.canInvalidateBallot);
    
    changeElectionRollState(
        req,
        'invalid',
        ['flagged'],  // Can only invalidate flagged entries
        permissions.canInvalidateBallot
    );
};
```

### Why Must Flag First?

Requiring the `flagged` intermediate state:
1. Creates clear audit trail
2. Gives admin review opportunity
3. Prevents accidental invalidation
4. Shows deliberate decision-making

---

## Sending Invitations

### Send All Invitations

```
POST /API/Election/{id}/sendInvites
```

**Required Permission:** `canSendEmails` (owner, admin)

**Prerequisites:**
- `voter_access = 'closed'`
- `invitation = 'email'`
- Voter roll exists

### What Happens

```typescript
const sendInvitationsController = async (req, res, next) => {
    expectPermission(req.user_auth.roles, permissions.canSendEmails);
    
    const roll = await ElectionRollModel.getRollsByElectionID(election_id);
    
    // Filter out already-invited voters
    const needsInvite = roll.filter(entry => {
        if (!entry.email_data?.inviteResponse) return true;
        if (entry.email_data.inviteResponse.length === 0) return true;
        if (entry.email_data.inviteResponse[0].statusCode >= 400) return true;
        return false;
    });
    
    if (needsInvite.length === 0) {
        throw new BadRequest("All invites already sent");
    }
    
    // Queue email jobs
    const jobs = needsInvite.map(entry => ({
        requestId: req.contextId,
        election: election,
        url: req.protocol + '://' + req.get('host'),
        electionRoll: entry,
        sender: req.user.email
    }));
    
    await EventQueue.publishBatch("sendInviteEvent", jobs);
};
```

### Email Content

The invitation includes:
- Election title and description
- Unique voting link with voter ID
- Instructions for voting

### Tracking Email Status

Each roll entry tracks email delivery:

```typescript
interface EmailData {
    inviteResponse?: [{
        statusCode: 202,  // SendGrid response
        body: "",
        headers: {...}
    }];
    reminderResponse?: [...];
}
```

### Send Individual Invitation

```
POST /API/Election/{id}/sendInvite/{voter_id}
```

Sends to a single voter (useful for re-sending after failure).

---

## Viewing the Roll

### Get All Roll Entries

```
GET /API/Election/{id}/rolls
```

**Required Permission:** `canViewElectionRoll` (all official roles)

**Restrictions:**
- Cannot view roll for `voter_access='open'` elections

### Data Scrubbing

The response scrubs sensitive data:

```typescript
const scrubbedRoll = electionRoll.map(entry => {
    const base = {
        ...entry,
        ballot_id: undefined,    // Remove ballot link
        ip_hash: undefined,      // Remove IP
        history: sanitizeHistory(entry.history, entry.voter_id, redactVoterIds),
        email_data: sanitizeEmailData(entry.email_data, entry.voter_id, redactVoterIds)
    };
    
    // For email elections, redact voter_id too
    if (redactVoterIds) {
        delete base.voter_id;
    }
    
    return base;
});
```

### Why Scrub Data?

1. **ballot_id removed**: Prevents linking voters to specific ballots (ballot secrecy)
2. **ip_hash removed**: Privacy protection
3. **voter_id redacted** (email elections): Prevents admins from knowing which ballot belongs to which voter

### Get Single Entry

```
GET /API/Election/{id}/rolls/{voter_id}
```

Returns single roll entry (same scrubbing applied).

---

## Emergency Access

### Reveal Voter ID

```
POST /API/Election/{id}/rolls/revealVoterId
```

🚨 **EMERGENCY ONLY** 🚨

This endpoint reveals the voter_id for a given email. It's for emergencies like:
- Voter can't access their unique link
- Email delivery failed
- Need to manually send voting URL

### Heavy Audit Trail

```typescript
const revealVoterIdByEmail = async (req, res, next) => {
    if (election.settings.invitation !== 'email') {
        throw new BadRequest("Only available for email elections");
    }
    
    expectPermission(req.user_auth.roles, permissions.canViewElectionRoll);
    
    const actor = req.user?.email || 'unknown';
    
    // PROMINENT LOGGING
    Logger.error(req, `🚨 BREAK GLASS 🚨 revealVoterId - Election: ${election_id}, Email: ${email}, Actor: ${actor}`);
    console.error(`🚨🚨🚨 BREAK GLASS: Voter ID revealed for ${email} in election ${election_id} by ${actor} 🚨🚨🚨`);
    
    const roll = await ElectionRollModel.getRollsByElectionID(election_id);
    const entry = roll.find(r => r.email?.toLowerCase() === email.toLowerCase());
    
    if (!entry) {
        throw new BadRequest(`No voter found with email ${email}`);
    }
    
    // Log in roll history
    entry.history.push({
        action_type: '🚨 VOTER_ID_REVEALED',
        actor: actor,
        timestamp: Date.now()
    });
    await ElectionRollModel.update(entry);
    
    Logger.error(req, `🚨 BREAK GLASS COMPLETED 🚨 Voter ID ${entry.voter_id} revealed`);
    
    res.json({
        voter_id: entry.voter_id,
        email: entry.email,
        warning: 'This action has been logged in the audit trail'
    });
};
```

### When to Use

- Voter reports not receiving email
- Need to re-send unique URL manually
- Technical support situation

### Audit Visibility

This action is highly visible:
1. Logger.error with 🚨 emoji (shows in monitoring)
2. console.error (shows in server logs)
3. Roll entry history (permanent audit trail)
4. Warning in response

Anyone reviewing logs will immediately see this action occurred.
