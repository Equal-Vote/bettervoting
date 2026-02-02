---
layout: default
title: 📦 Domain Models
nav_order: 1
parent: 🔧 Backend Developer Guide
grand_parent: 💻 Developers
---

# Domain Models

This document provides a complete reference for all data structures used in BetterVoting. Understanding these models is essential for working with the backend.

---

## Table of Contents

1. [Election](#election)
2. [Race](#race)
3. [Candidate](#candidate)
4. [ElectionSettings](#electionsettings)
5. [Ballot](#ballot)
6. [Vote](#vote)
7. [Score](#score)
8. [ElectionRoll](#electionroll)

---

## Election

The Election object is the central data structure in BetterVoting. It contains everything needed to define, run, and manage an election.

### TypeScript Interface

```typescript
interface Election {
    election_id:    string;      // Unique identifier (slug or UUID)
    title:          string;      // Display title (3-256 chars)
    description?:   string;      // Markdown description
    frontend_url:   string;      // Base URL for voting links
    start_time?:    Date|string; // When voting opens (optional)
    end_time?:      Date|string; // When voting closes (optional)
    owner_id:       string;      // User ID of creator
    audit_ids?:     string[];    // Emails with auditor access
    admin_ids?:     string[];    // Emails with admin access
    credential_ids?:string[];    // Emails with credentialer access
    state:          ElectionState;
    races:          Race[];      // One or more contests
    settings:       ElectionSettings;
    auth_key?:      string;      // Election-specific auth (hidden from API)
    claim_key_hash?:string;      // For claiming temp elections
    is_public?:     boolean;     // Shows in public listings
    create_date:    Date|string; // ISO 8601 timestamp
    update_date:    Date|string; // Epoch milliseconds as string
    head:           boolean;     // True = current version
    ballot_source:  'live_election' | 'prior_election';
    public_archive_id?: string;  // For public archive elections
}
```

### Field Descriptions

#### Identification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `election_id` | string | Yes | Unique identifier. Can be a custom slug (lowercase, e.g., "board-election-2024") or auto-generated UUID. Must be lowercase. Used in URLs. |
| `title` | string | Yes | Human-readable title displayed to voters. Must be 3-256 characters (except in draft state where it can be shorter). |
| `description` | string | No | Markdown-formatted description shown on the election page. Can include formatting, links, etc. |
| `frontend_url` | string | Yes | Base URL for constructing voting links. Usually "https://bettervoting.com" or the domain where the frontend is hosted. |

#### Timing

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_time` | Date/string | No | When voting opens. If set, election auto-transitions from `finalized` to `open` when this time passes. If not set, transitions immediately upon finalization. |
| `end_time` | Date/string | No | When voting closes. If set, election auto-transitions from `open` to `closed` when this time passes. If not set, must be manually closed. |

#### Access Control

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner_id` | string | Yes | User ID (Keycloak UUID or temp ID like "v-abc123") of the election creator. Has full control over the election. |
| `admin_ids` | string[] | No | Email addresses of users with admin access. Admins can edit settings, manage voter rolls, view ballots. |
| `audit_ids` | string[] | No | Email addresses of users with auditor access. Auditors can view (but not modify) ballots and voter rolls. |
| `credential_ids` | string[] | No | Email addresses of users with credentialer access. Credentialers can approve/flag voter registrations. |

#### State & Settings

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | ElectionState | Yes | Current state: `draft`, `finalized`, `open`, `closed`, or `archived`. See [Election Lifecycle](./election-lifecycle). |
| `races` | Race[] | Yes | Array of contests/races in this election. Must have at least one race. |
| `settings` | ElectionSettings | Yes | Configuration object controlling voter access, authentication, and behavior. |

#### Security

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `auth_key` | string | No | Election-specific authentication key. **Hidden from API responses** (set to undefined before returning). Used for election-specific JWT validation. |
| `claim_key_hash` | string | No | SHA-256 hash of the claim key. Used to transfer ownership from temp user to logged-in user. Original key is shown once at creation. |
| `is_public` | boolean | No | If true, election appears in public listings (open elections page). Only applies when `voter_access=open` and `state=open`. |

#### Versioning

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `create_date` | Date/string | Yes | When the election was first created. ISO 8601 format. |
| `update_date` | Date/string | Yes | When this version was created. Stored as epoch milliseconds (string). |
| `head` | boolean | Yes | `true` for the current version, `false` for historical versions. Always query with `WHERE head=true` for current data. |

#### Special Types

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ballot_source` | string | Yes | `live_election` for normal elections, `prior_election` for admin-uploaded historical data. |
| `public_archive_id` | string | No | Unique identifier for public archive elections (e.g., "Genola_11022021_CityCouncil"). |

### Database Storage

**Table:** `electionDB`

**Primary Key:** `(election_id, update_date)` - Composite key for temporal versioning

**Indexes:**
- `electionDB_head` on `head` column for efficient current-version queries

**JSON Columns:**
- `races` - Stored as PostgreSQL JSON
- `settings` - Stored as PostgreSQL JSON  
- `admin_ids`, `audit_ids`, `credential_ids` - Stored as PostgreSQL JSON arrays

### Validation Rules

The election is validated by `electionValidation()` function:

1. `election_id` must be lowercase string
2. `title` must be 3-256 characters (except in draft state)
3. `races` must be a non-empty array
4. No duplicate `race_id` values within races
5. No duplicate race titles
6. Each race must pass `raceValidation()`
7. `settings` must pass `electionSettingsValidation()`
8. If `admin_ids`/`audit_ids`/`credential_ids` provided, no duplicates within each

---

## ElectionState

Elections progress through five states:

```typescript
type ElectionState = 'draft' | 'finalized' | 'open' | 'closed' | 'archived';
```

| State | Editable | Voting | Results | Description |
|-------|:--------:|:------:|:-------:|-------------|
| `draft` | ✓ | Test only | No | Initial state. Election is being configured. Can cast test votes. |
| `finalized` | No | No | No | Locked and waiting. All test ballots are deleted. Waiting for `start_time` or immediate transition to open. |
| `open` | No | ✓ | If enabled | Active voting period. Voters can submit ballots. Results visible if `public_results=true`. |
| `closed` | No | No | ✓ | Voting ended. Results always visible. Can be reopened if no scheduled times. |
| `archived` | No | No | ✓ | Permanently archived for historical reference. |

### State Transitions

```
                    finalize()                    start_time passes
    ┌───────┐      ─────────────►    ┌───────────┐    ─────────────►    ┌──────┐
    │ draft │                        │ finalized │                       │ open │
    └───────┘                        └───────────┘                       └──────┘
                                                                            │
                                                              end_time passes │
                                                              OR setOpenState │
                                                                            ▼
                                    ┌──────────┐    archive()    ┌────────┐
                                    │ archived │  ◄───────────   │ closed │
                                    └──────────┘                 └────────┘
                                                                    ▲
                                                     setOpenState(true)
                                                     (only if no scheduled times)
```

---

## Race

A Race represents a single contest within an election (e.g., "President", "Board Member Seat A").

### TypeScript Interface

```typescript
interface Race {
    race_id:        string;       // Unique identifier within election
    title:          string;       // Display title (3-256 chars)
    description?:   string;       // Markdown description
    voting_method:  VotingMethod; // Algorithm for counting
    num_winners:    number;       // Seats to fill (1-100)
    candidates:     Candidate[];  // At least 2 candidates
    precincts?:     string[];     // Restrict to specific precincts
}
```

### Voting Methods

```typescript
type VotingMethod = 'STAR' | 'STAR_PR' | 'Approval' | 'RankedRobin' | 'IRV' | 'Plurality' | 'STV';
```

| Method | Score Range | Description |
|--------|-------------|-------------|
| `STAR` | 0-5 | STAR Voting: Score then Automatic Runoff. Best for single winner. |
| `STAR_PR` | 0-5 | Proportional STAR for multi-winner elections. |
| `Approval` | 0-1 | Approve (1) or don't approve (0) each candidate. |
| `Plurality` | 0-1 | Traditional "pick one" voting. |
| `IRV` | 1-N | Instant Runoff Voting (Ranked Choice). Rank candidates. |
| `STV` | 1-N | Single Transferable Vote. Multi-winner ranked choice. |
| `RankedRobin` | 1-N | Round Robin comparison of ranked ballots. |

### Precinct Filtering

The `precincts` field allows restricting which voters see this race:

- If `precincts` is null/undefined: All voters can vote in this race
- If `precincts` is an array: Only voters whose `electionRoll.precinct` matches one of the values see this race

Example:
```json
{
  "race_id": "district-3-council",
  "title": "District 3 City Council",
  "precincts": ["district-3", "district-3a", "district-3b"]
}
```

### Validation Rules

1. `race_id` must be a non-empty string
2. `title` must be 3-256 characters
3. `voting_method` must be one of the valid methods
4. `num_winners` must be 1-100
5. `candidates` must have at least 2 entries
6. No duplicate `candidate_id` values
7. No duplicate `candidate_name` values

---

## Candidate

A Candidate represents one option voters can choose in a race.

### TypeScript Interface

```typescript
interface Candidate {
    candidate_id:    string;   // Unique identifier within race
    candidate_name:  string;   // Display name (3-256 chars)
    full_name?:      string;   // Full legal name
    bio?:            string;   // Markdown biography
    party?:          string;   // Party affiliation
    party_url?:      string;   // Link to party info
    candidate_url?:  string;   // Link to candidate info
    photo_filename?: string;   // S3 image filename
}
```

### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `candidate_id` | Yes | Unique identifier within the race. Used in ballot scores. |
| `candidate_name` | Yes | Display name shown on ballot. 3-256 characters. |
| `full_name` | No | Full legal name if different from display name. |
| `bio` | No | Markdown biography/description. |
| `party` | No | Political party or affiliation text. |
| `party_url` | No | URL to party website. Must be valid URL format. |
| `candidate_url` | No | URL to candidate's website. Must be valid URL format. |
| `photo_filename` | No | Filename of photo in S3 (uploaded via `/API/images`). |

---

## ElectionSettings

Controls how the election operates, who can vote, and how they're authenticated.

### TypeScript Interface

```typescript
interface ElectionSettings {
    voter_access?:         'open' | 'closed' | 'registration';
    voter_authentication:  Authentication;
    invitation?:           'email' | 'address';
    reminders?:            boolean;
    ballot_updates?:       boolean;
    public_results?:       boolean;
    time_zone?:            string;
    random_candidate_order?: boolean;
    require_instruction_confirmation?: boolean;
    break_ties_randomly?:  boolean;
    term_type?:            'poll' | 'election';
    max_rankings?:         number;
    contact_email?:        string;
    draggable_ballot?:     boolean;
}

interface Authentication {
    voter_id?:   boolean;  // Require voter ID
    email?:      boolean;  // Require email verification
    ip_address?: boolean;  // Track IP for duplicate detection
    // Legacy/unused fields:
    phone?:      boolean;
    address?:    boolean;
    registration_data?: RegistrationField[];
}
```

### Voter Access Modes

| Mode | Description | Voter Roll | Use Case |
|------|-------------|------------|----------|
| `open` | Anyone can vote | Created dynamically | Public polls, community decisions |
| `closed` | Only pre-registered voters | Must be pre-populated | Official elections, organization votes |
| `registration` | Voters must register, admin approves | Created on registration | Elections requiring verification |

### Authentication Options

These settings in `voter_authentication` control how voters are identified:

| Setting | Effect When Enabled |
|---------|---------------------|
| `voter_id` | **Closed elections:** Voter must provide their assigned voter ID via cookie. **Open elections:** Voter must be logged in (uses Keycloak user ID). |
| `email` | Voter must be logged in with a verified email address. |
| `ip_address` | IP address is hashed and stored. Used to detect multiple votes from same device. Note: Not a hard block, just tracking. |

### Important Setting Combinations

#### ballot_updates

When `ballot_updates=true`:
- Voters can change their vote before the election closes
- When voter submits again, old ballot is marked `head=false`, new ballot created
- **Restrictions:**
  - Cannot be used with `voter_access=open` (no way to identify returning voter)
  - Cannot be used without `invitation=email` (need way to verify voter identity)
  - `public_results` must be false while election is open (prevents vote buying)

#### public_results

When `public_results=true`:
- Anyone can view live results at `/API/ElectionResult/{id}`
- Results update as votes come in
- **Restriction:** Cannot be enabled while `ballot_updates=true` and election is open

### Compatibility Rules

The system enforces these rules (via `settingsCompatiblityValidation`):

```javascript
if (ballot_updates) {
    if (public_results && state not in ['closed', 'archived']) {
        ERROR: "Preliminary results not permitted when ballot updating enabled"
    }
    if (voter_access == 'open') {
        ERROR: "Ballot updating not permitted on open access elections"
    }
    if (invitation != 'email') {
        ERROR: "Ballot updating only permitted on email list elections"
    }
}
```

---

## Ballot

A Ballot represents a voter's submitted choices.

### TypeScript Interface

```typescript
interface Ballot {
    ballot_id:      string;       // Unique identifier
    election_id:    string;       // Election this belongs to
    user_id?:       string;       // Keycloak user ID (if logged in)
    status:         string;       // 'saved' or 'submitted'
    date_submitted: number;       // Unix timestamp (Date.now())
    ip_hash?:       string;       // Hashed IP address
    votes:          Vote[];       // One vote per race
    history?:       BallotAction[];
    precinct?:      string;       // Voter's precinct
    create_date:    Date|string;
    update_date:    Date|string;
    head:           boolean;
}

interface BallotAction {
    action_type: string;   // 'submitted_via_browser', 'submitted_via_admin', etc.
    actor:       string;   // voter_id or admin who performed action
    timestamp:   number;   // Unix timestamp
}
```

### Database Storage

**Table:** `ballotDB`

**Primary Key:** `(ballot_id, update_date)` - Composite key for temporal versioning

### Ballot Lifecycle

1. **Created:** When voter submits, `ballot_id` is auto-generated (format: `b-{uuid}`)
2. **Stored:** Ballot saved to `ballotDB` with `head=true`
3. **Updated (if ballot_updates):** New row inserted with `head=true`, old row set to `head=false`
4. **Never deleted:** Historical ballots preserved for audit trail

### Important Security Note

When returning a ballot to a voter after submission, the `ballot_id` is **scrubbed** (set to undefined). This prevents:
- Vote buying (voter can't prove how they voted)
- Coercion (voter can't show their ballot to someone)

Only officials with `canViewBallots` permission can see ballot IDs.

---

## Vote

A Vote represents the scores a voter assigned in one race.

### TypeScript Interface

```typescript
interface Vote {
    race_id:            string;    // Must match a race in the election
    scores:             Score[];   // One per candidate
    overvote_rank?:     number;    // For ranked: first rank with overvote
    has_duplicate_rank?: boolean;  // For ranked: had duplicate rankings
}

interface Score {
    candidate_id: string;   // Must match a candidate in the race
    score:        number;   // Value depends on voting method
}
```

### Score Ranges by Voting Method

| Voting Method | Valid Score Range | Example |
|---------------|-------------------|---------|
| STAR, STAR_PR | 0-5 | `{candidate_id: "alice", score: 5}` |
| Approval, Plurality | 0-1 | `{candidate_id: "alice", score: 1}` |
| IRV, STV, RankedRobin | 1 to N | `{candidate_id: "alice", score: 1}` (1st choice) |

### Ranked Voting Special Fields

For ranked choice methods (IRV, STV, RankedRobin):

- `overvote_rank`: If voter gave same rank to multiple candidates, this is the first rank where it happened
- `has_duplicate_rank`: Boolean indicating if any duplicate rankings exist

These are used for proper ballot handling in tabulation.

---

## ElectionRoll

The ElectionRoll tracks who can vote and who has voted. Each entry represents one potential voter.

### TypeScript Interface

```typescript
interface ElectionRoll {
    voter_id:      string;           // Unique within election
    election_id:   string;           // Election this belongs to
    email?:        string;           // Voter's email
    submitted:     boolean;          // Has voted?
    ballot_id?:    string;           // If voted, which ballot
    ip_hash?:      string;           // Hashed IP address
    address?:      string;           // Physical address (rarely used)
    state:         ElectionRollState;
    history?:      ElectionRollAction[];
    registration?: any;              // Custom registration data
    precinct?:     string;           // Voter's precinct for filtering
    email_data?:   EmailData;
    create_date:   Date|string;
    update_date:   Date|string;
    head:          boolean;
}

type ElectionRollState = 'approved' | 'flagged' | 'registered' | 'invalid';

interface ElectionRollAction {
    action_type: string;   // 'added', 'approved', 'flagged', etc.
    actor:       string;   // Who performed the action
    timestamp:   number;   // When
    email_data?: any;      // Email send response if applicable
}

interface EmailData {
    inviteResponse?:   any;  // SendGrid response for invite
    reminderResponse?: any;  // SendGrid response for reminder
}
```

### Roll States

| State | Can Vote | Description |
|-------|:--------:|-------------|
| `approved` | ✓ | Voter is authorized to cast a ballot |
| `registered` | No | Voter has registered but needs admin approval |
| `flagged` | No | Voter flagged for review (suspicious or needs verification) |
| `invalid` | No | Voter has been marked invalid (cannot vote) |

### State Transitions

```
                                              approve()
    ┌────────────┐                         ┌───────────┐
    │ registered │ ─────────────────────►  │ approved  │
    └────────────┘                         └───────────┘
          │                                      │
          │ flag()                               │ flag()
          ▼                                      ▼
    ┌────────────┐        unflag()         ┌───────────┐
    │  flagged   │ ◄────────────────────── │  flagged  │
    └────────────┘                         └───────────┘
          │                                      │
          │ invalidate()                         │ invalidate()
          ▼                                      ▼
    ┌────────────┐                         ┌───────────┐
    │  invalid   │                         │  invalid  │
    └────────────┘                         └───────────┘
```

### Database Storage

**Table:** `electionRollDB`

**Primary Key:** `(election_id, voter_id, update_date)` - Composite key

### Roll Creation

Rolls are created in different ways depending on election settings:

| Scenario | How Roll is Created | Initial State |
|----------|---------------------|---------------|
| Closed + Admin adds | Admin uploads via UI or API | `approved` |
| Closed + Email invitation | Admin adds emails, system generates voter_ids | `approved` |
| Open election | Auto-created when voter first accesses | `approved` |
| Registration election | Voter registers, waits for approval | `registered` |

### The `submitted` Flag

The `submitted` field is critical:
- `false`: Voter has not cast a ballot yet
- `true`: Voter has submitted a ballot

When `submitted=true` and `ballot_updates=false`, the voter cannot vote again.

### Email Tracking

The `email_data` field tracks invitation/reminder emails:

```json
{
  "inviteResponse": [{
    "statusCode": 202,
    "body": "",
    "headers": {...}
  }],
  "reminderResponse": [{
    "statusCode": 202,
    "body": "",
    "headers": {...}
  }]
}
```

This allows admins to see which voters received emails and troubleshoot delivery issues.
