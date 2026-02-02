---
layout: default
title: 🔐 Authentication & Authorization
nav_order: 2
parent: 🔧 Backend Developer Guide
grand_parent: 💻 Developers
---

# Authentication & Authorization

This document explains how BetterVoting identifies users, assigns roles, and controls access to operations.

---

## Table of Contents

1. [User Identity](#user-identity)
2. [Cookies & Tokens](#cookies--tokens)
3. [Roles](#roles)
4. [Role Assignment](#role-assignment)
5. [Permissions](#permissions)
6. [Permission Matrix](#permission-matrix)
7. [Voter Authentication](#voter-authentication)
8. [Common Authorization Patterns](#common-authorization-patterns)

---

## User Identity

BetterVoting identifies users in several ways:

### Logged-in Users (Keycloak)

Users who log in via Keycloak (Google, email/password) get a JWT token containing:

```typescript
interface User {
    sub:   string;  // Keycloak user UUID (e.g., "a1b2c3d4-e5f6-...")
    email: string;  // Verified email address
    typ:   'ID';    // Indicates logged-in user
}
```

### Temporary Users

Users who don't log in get a temporary ID stored in a cookie:

```typescript
interface TempUser {
    sub:   string;  // Temp ID (format: "v-{uuid}")
    email: undefined;
    typ:   'TEMP_ID';
}
```

Temporary users can:
- Create elections (become owner)
- Edit their elections for 24 hours
- Claim elections by logging in with the claim key

### Anonymous Users

Some operations don't require any identification:
- Viewing public elections
- Voting in fully open elections (though roll entry is created)
- Viewing public results

---

## Cookies & Tokens

The backend reads identity from these cookies:

### `id_token`

- **Source:** Set by Keycloak after login
- **Content:** JWT containing user info
- **Lifetime:** Session or "remember me" duration
- **Used for:** Identifying logged-in users

### `temp_id`

- **Source:** Set by frontend when user first visits
- **Content:** String in format "v-{uuid}"
- **Lifetime:** Long-lived (browser storage)
- **Used for:** Identifying returning visitors without accounts

### `voter_id`

- **Source:** Set by frontend for closed elections
- **Content:** Base64-encoded voter ID string
- **Lifetime:** Session
- **Used for:** Identifying voters in closed elections with voter ID auth

### `{election_id}_claim_key`

- **Source:** Set when user creates election without account
- **Content:** The original claim key (unhashed)
- **Lifetime:** Long-lived
- **Used for:** Verifying ownership for claiming elections

---

## Roles

BetterVoting defines five roles, each with different capabilities:

### `system_admin`

**Who:** Internal administrators (not assignable via UI)

**Powers:**
- Full access to everything
- Can modify any election
- Can access admin-only endpoints

### `owner`

**Who:** The user who created the election

**Powers:**
- Complete control over their election
- Can delete the election
- Can change all settings
- Can transfer ownership
- Can edit roles (admins, auditors, credentialers)

### `admin`

**Who:** Users whose email is in `election.admin_ids`

**Powers:**
- Can edit election settings (in draft)
- Can manage voter rolls
- Can view ballots
- Can send emails
- Cannot delete election or change roles

### `auditor`

**Who:** Users whose email is in `election.audit_ids`

**Powers:**
- Can view voter rolls (read-only)
- Can view ballots (read-only)
- Can view preliminary results
- Can flag suspicious registrations
- Cannot modify anything

### `credentialer`

**Who:** Users whose email is in `election.credential_ids`

**Powers:**
- Can view voter rolls
- Can approve registrations
- Can flag registrations
- Cannot view ballots
- Cannot modify election settings

---

## Role Assignment

Roles are determined in the `electionPostAuthMiddleware` function, which runs for every election-specific request.

### How Owner Role is Assigned

```typescript
// In electionPostAuthMiddleware:

const ownerIsTempUser = election.owner_id.startsWith('v-');
const hoursSinceCreate = (now - createDate) / (1000 * 60 * 60);

const tempUserAuth =
    ownerIsTempUser && 
    election.owner_id == req.cookies.temp_id &&
    hoursSinceCreate < 24 &&  // sharedConfig.TEMPORARY_ACCESS_HOURS
    hashString(req.cookies[`${election_id}_claim_key`]) === election.claim_key_hash;

if (user.sub === election.owner_id || tempUserAuth) {
    roles.push('owner');
}
```

**Owner is assigned when:**
1. User's Keycloak ID (`user.sub`) matches `election.owner_id`, OR
2. ALL of these are true for temporary ownership:
   - Election was created by a temp user (`owner_id` starts with "v-")
   - User's `temp_id` cookie matches `owner_id`
   - Less than 24 hours since election creation
   - User's `{election_id}_claim_key` cookie hashes to match `claim_key_hash`

### How Other Roles are Assigned

```typescript
if (election.admin_ids?.includes(user.email)) {
    roles.push('admin');
}
if (election.audit_ids?.includes(user.email)) {
    roles.push('auditor');
}
if (election.credential_ids?.includes(user.email)) {
    roles.push('credentialer');
}
```

**Important:** Users can have multiple roles simultaneously. A user could be both `admin` and `auditor`.

---

## Permissions

Permissions are capability checks derived from roles. Each permission is an array of roles that have that capability.

### Permission Definitions

```typescript
const permissions = {
    // Election management
    canEditElectionRoles:      ['system_admin', 'owner'],
    canViewElection:           ['system_admin', 'owner', 'admin', 'auditor', 'credentialer'],
    canEditElection:           ['system_admin', 'owner', 'admin'],
    canDeleteElection:         ['system_admin', 'owner'],
    canEditElectionState:      ['system_admin', 'owner'],
    canClaimElection:          ['system_admin', 'owner'],
    
    // Voter roll management
    canEditElectionRoll:       ['system_admin', 'owner'],
    canAddToElectionRoll:      ['system_admin', 'owner', 'admin'],
    canViewElectionRoll:       ['system_admin', 'owner', 'admin', 'auditor', 'credentialer'],
    canFlagElectionRoll:       ['system_admin', 'owner', 'admin', 'auditor', 'credentialer'],
    canApproveElectionRoll:    ['system_admin', 'owner', 'admin', 'credentialer'],
    canUnflagElectionRoll:     ['system_admin', 'owner', 'admin'],
    canInvalidateElectionRoll: ['system_admin', 'owner', 'admin'],
    canDeleteElectionRoll:     ['system_admin', 'owner'],
    canViewElectionRollIDs:    ['system_admin', 'auditor'],
    
    // Ballot management
    canViewBallots:            ['system_admin', 'owner', 'admin', 'auditor'],
    canDeleteAllBallots:       ['system_admin', 'owner', 'admin'],
    canViewBallot:             ['system_admin'],
    canEditBallot:             ['system_admin', 'owner'],
    canFlagBallot:             ['system_admin', 'owner', 'admin', 'auditor'],
    canInvalidateBallot:       ['system_admin', 'owner'],
    
    // Results and email
    canViewPreliminaryResults: ['system_admin', 'owner', 'admin', 'auditor'],
    canSendEmails:             ['system_admin', 'owner', 'admin'],
    
    // Special
    canUpdatePublicArchive:    ['system_admin'],
    canUploadBallots:          ['system_admin', 'owner'],
    canQueryElections:         ['system_admin'],
}
```

### How Permissions are Checked

Controllers use `expectPermission()` to verify authorization:

```typescript
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';

const deleteElection = async (req, res, next) => {
    // This throws Forbidden if user lacks the permission
    expectPermission(req.user_auth.roles, permissions.canDeleteElection);
    
    // If we get here, user is authorized
    await ElectionsModel.delete(electionId);
};
```

### Permission Check Logic

```typescript
function hasPermission(userRoles: string[], permission: string[]): boolean {
    return userRoles.some(role => permission.includes(role));
}

function expectPermission(userRoles: string[], permission: string[]): void {
    if (!hasPermission(userRoles, permission)) {
        throw new Forbidden("User does not have required permission");
    }
}
```

---

## Permission Matrix

Full matrix of permissions by role:

| Permission | system_admin | owner | admin | auditor | credentialer |
|:-----------|:------------:|:-----:|:-----:|:-------:|:------------:|
| **Election Management** |
| canEditElectionRoles | ✓ | ✓ | | | |
| canViewElection | ✓ | ✓ | ✓ | ✓ | ✓ |
| canEditElection | ✓ | ✓ | ✓ | | |
| canDeleteElection | ✓ | ✓ | | | |
| canEditElectionState | ✓ | ✓ | | | |
| canClaimElection | ✓ | ✓ | | | |
| **Voter Roll** |
| canEditElectionRoll | ✓ | ✓ | | | |
| canAddToElectionRoll | ✓ | ✓ | ✓ | | |
| canViewElectionRoll | ✓ | ✓ | ✓ | ✓ | ✓ |
| canFlagElectionRoll | ✓ | ✓ | ✓ | ✓ | ✓ |
| canApproveElectionRoll | ✓ | ✓ | ✓ | | ✓ |
| canUnflagElectionRoll | ✓ | ✓ | ✓ | | |
| canInvalidateElectionRoll | ✓ | ✓ | ✓ | | |
| canDeleteElectionRoll | ✓ | ✓ | | | |
| canViewElectionRollIDs | ✓ | | | ✓ | |
| **Ballots** |
| canViewBallots | ✓ | ✓ | ✓ | ✓ | |
| canDeleteAllBallots | ✓ | ✓ | ✓ | | |
| canViewBallot | ✓ | | | | |
| canEditBallot | ✓ | ✓ | | | |
| canFlagBallot | ✓ | ✓ | ✓ | ✓ | |
| canInvalidateBallot | ✓ | ✓ | | | |
| **Other** |
| canViewPreliminaryResults | ✓ | ✓ | ✓ | ✓ | |
| canSendEmails | ✓ | ✓ | ✓ | | |
| canUpdatePublicArchive | ✓ | | | | |
| canUploadBallots | ✓ | ✓ | | | |
| canQueryElections | ✓ | | | | |

---

## Voter Authentication

Separate from role-based authorization, voters must also pass authentication checks based on election settings.

### Authentication Flow

When a voter tries to cast a vote, the system checks:

```typescript
// 1. Check election settings
const authSettings = election.settings.voter_authentication;

// 2. Check what data is required
if (authSettings.voter_id && election.settings.voter_access == 'closed') {
    // Voter ID required from cookie
    voter_id = atob(req.cookies?.voter_id);
}
if (authSettings.voter_id && election.settings.voter_access == 'open') {
    // Must be logged in
    voter_id = req.user?.sub;
}
if (authSettings.email) {
    // Must be logged in with email
    email = req.user?.email;
}
if (authSettings.ip_address) {
    // IP will be hashed and tracked
    ip_hash = hashString(req.ip);
}

// 3. Missing data = cannot vote
if (!voter_id && authSettings.voter_id) {
    return "Voter ID Required";
}
if (!email && authSettings.email) {
    return "Email Validation Required";
}
```

### Authentication Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Voter ID Required" | Closed election, voter_id not in cookie | Enter voter ID |
| "User ID Required" | Open election with voter_id auth, not logged in | Log in |
| "Email Validation Required" | Email auth required, user not logged in | Log in with email |

### Roll-Based Authorization

After authentication, the system checks the voter roll:

```typescript
// Get matching roll entry
const rollEntry = await getOrCreateElectionRoll(req, election);

// Check authorization
if (rollEntry === null) {
    // No roll entry found
    if (election.settings.voter_access !== 'open') {
        // Closed elections require pre-registration
        return { authorized: false };
    }
    // Open elections create roll entry on demand
}

if (rollEntry.state !== 'approved') {
    // Only approved voters can vote
    return { authorized: false };
}

if (rollEntry.submitted && !election.settings.ballot_updates) {
    // Already voted and can't update
    return { authorized: false, has_voted: true };
}

return { authorized: true, has_voted: rollEntry.submitted };
```

---

## Common Authorization Patterns

### Pattern 1: Public Access with Optional Auth

Used for viewing elections:

```typescript
const returnElection = async (req, res) => {
    // No auth required to view
    // But response includes user's auth status
    const voterAuth = getVoterAuthorization(roll, missingAuth);
    
    res.json({
        election: election,
        voterAuth: {
            authorized_voter: voterAuth.authorized,
            has_voted: voterAuth.has_voted,
            roles: req.user_auth.roles,
            permissions: req.user_auth.permissions
        }
    });
};
```

### Pattern 2: Role-Based Permission Check

Used for admin operations:

```typescript
const deleteElection = async (req, res) => {
    // Must have owner or system_admin role
    expectPermission(req.user_auth.roles, permissions.canDeleteElection);
    
    // Permission check passed, proceed
    await ElectionsModel.delete(electionId);
};
```

### Pattern 3: State + Permission Check

Used for state-changing operations:

```typescript
const finalizeElection = async (req, res) => {
    // 1. Check permission
    expectPermission(req.user_auth.roles, permissions.canEditElectionState);
    
    // 2. Check state
    if (req.election.state !== 'draft') {
        throw new BadRequest("Election already finalized");
    }
    
    // Both checks passed, proceed
    req.election.state = 'finalized';
    await ElectionsModel.updateElection(req.election);
};
```

### Pattern 4: Voter Authentication + Roll Check

Used for casting votes:

```typescript
const castVote = async (req, res) => {
    // 1. Check election is open
    if (election.state !== 'open' && election.state !== 'draft') {
        throw new BadRequest("Election is not open");
    }
    
    // 2. Check voter has required auth data
    const missingAuth = checkForMissingAuthenticationData(req, election);
    if (missingAuth) {
        throw new Unauthorized(missingAuth);
    }
    
    // 3. Get/create roll entry
    const roll = await getOrCreateElectionRoll(req, election);
    
    // 4. Check voter is authorized
    const auth = getVoterAuthorization(roll, missingAuth);
    if (!auth.authorized) {
        throw new Unauthorized("Not authorized to vote");
    }
    if (auth.has_voted && !election.settings.ballot_updates) {
        throw new BadRequest("Already voted");
    }
    
    // All checks passed, accept vote
};
```

### Pattern 5: Conditional Public Access

Used for results:

```typescript
const getResults = async (req, res) => {
    // Results are public if:
    // - public_results is enabled, OR
    // - election is closed
    if (!election.settings.public_results) {
        if (election.state === 'open') {
            // Not public AND still open = need permission
            expectPermission(req.user_auth.roles, permissions.canViewPreliminaryResults);
        }
        // Closed elections: anyone can view
    }
    // Either public, or closed, or have permission
    const results = await calculateResults(election);
    res.json({ results });
};
```
