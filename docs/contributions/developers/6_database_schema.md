---
layout: default
title: 🗃️ Database Schema
nav_order: 6
parent: 💻 Developers
---

# Database Schema

This document provides a complete reference of the database schema used in BetterVoting. The application uses PostgreSQL as its database with Kysely as the type-safe query builder.

## Overview

BetterVoting uses three main tables:

| Table | Description |
|-------|-------------|
| `electionDB` | Stores election metadata, configuration, and races |
| `electionRollDB` | Stores voter registration and voting status |
| `ballotDB` | Stores submitted ballots and votes |

All tables implement **temporal versioning** using `head`, `create_date`, and `update_date` columns. When a record is updated, a new row is inserted with `head = true`, and the previous version is set to `head = false`. This preserves full history of all changes.

---

## electionDB

Stores all election data including metadata, configuration, races, and access control.

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `election_id` | `varchar` | No | Unique identifier for the election (part of composite PK) |
| `update_date` | `varchar` | No | Timestamp of last update in milliseconds since epoch (part of composite PK) |
| `title` | `varchar` | Yes | Display title of the election |
| `description` | `text` | Yes | Markdown description of the election |
| `frontend_url` | `varchar` | Yes | Base URL for the frontend |
| `start_time` | `varchar` | Yes | When voting starts (ISO 8601 format) |
| `end_time` | `varchar` | Yes | When voting ends (ISO 8601 format) |
| `owner_id` | `varchar` | Yes | User ID of the election owner |
| `audit_ids` | `json` | Yes | Array of user IDs with audit access |
| `admin_ids` | `json` | Yes | Array of user IDs with admin access |
| `credential_ids` | `json` | Yes | Array of user IDs with credentialing access |
| `state` | `varchar` | Yes | Election state: `draft`, `finalized`, `open`, `closed`, `archived` |
| `races` | `json` | No | Array of race definitions (see Race structure below) |
| `settings` | `json` | Yes | Election settings object (see Settings structure below) |
| `auth_key` | `varchar` | Yes | Authentication key for the election |
| `claim_key_hash` | `varchar` | Yes | Hashed key for claiming unclaimed elections |
| `is_public` | `boolean` | Yes | Whether the election is publicly visible |
| `create_date` | `varchar` | No | Timestamp when record was created (ISO 8601) |
| `head` | `boolean` | No | `true` for current version, `false` for historical versions |
| `ballot_source` | `varchar` | No | Source of ballots: `live_election` or `prior_election` |
| `public_archive_id` | `varchar` | Yes | Unique identifier for public archive mapping |

### Primary Key

Composite key: `(election_id, update_date)`

### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `electionDB_head` | `head` | Fast lookup of current versions |

### Race Structure (JSON)

Each race in the `races` array has the following structure:

```json
{
  "race_id": "unique-race-id",
  "title": "Race Title",
  "description": "Race description in markdown",
  "voting_method": "STAR | STAR_PR | RankedRobin | IRV | STV | Approval | Plurality",
  "num_winners": 1,
  "candidates": [
    {
      "candidate_id": "unique-candidate-id",
      "candidate_name": "Candidate Name",
      "party_affiliation": "Party Name",
      "description": "Bio or description"
    }
  ],
  "precincts": ["precinct1", "precinct2"]
}
```

### Settings Structure (JSON)

```json
{
  "voter_access": "open | closed | registration",
  "voter_authentication": {
    "ip_address": true,
    "voter_id": true,
    "email": true
  },
  "invitation": "email | link | none",
  "ballot_updates": false,
  "public_results": true,
  "time_zone": "America/Los_Angeles",
  "random_candidate_order": true,
  "require_instruction_confirmation": false,
  "contact_email": "contact@example.com",
  "max_rankings": 5,
  "custom_email_subject": "Custom Subject",
  "custom_email_body": "Custom email body with {{BALLOT_URL}} placeholder"
}
```

---

## electionRollDB

Stores voter registration information and tracks voting status for each election.

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `election_id` | `varchar` | No | Reference to the election (part of composite PK) |
| `voter_id` | `varchar` | No | Unique identifier for the voter within this election (part of composite PK) |
| `update_date` | `varchar` | No | Timestamp of last update (part of composite PK) |
| `email` | `varchar` | Yes | Voter's email address |
| `submitted` | `boolean` | No | Whether the voter has submitted a ballot |
| `ballot_id` | `varchar` | Yes | Reference to the submitted ballot |
| `ip_hash` | `varchar` | Yes | Hashed IP address for duplicate detection |
| `address` | `varchar` | Yes | Voter's physical address |
| `state` | `varchar` | No | Roll state: `approved`, `flagged`, `registered`, `invalid` |
| `history` | `json` | Yes | Array of actions taken on this roll entry |
| `registration` | `json` | Yes | Custom registration data |
| `precinct` | `varchar` | Yes | Voter's precinct for precinct-based elections |
| `email_data` | `json` | Yes | Data about sent emails (invites, reminders) |
| `create_date` | `varchar` | No | Timestamp when record was created |
| `head` | `boolean` | No | `true` for current version, `false` for historical |

### Primary Key

Composite key: `(election_id, voter_id, update_date)`

### Roll States

| State | Description |
|-------|-------------|
| `approved` | Voter is approved to cast a ballot |
| `flagged` | Voter registration is flagged for review |
| `registered` | Voter has registered but not yet approved |
| `invalid` | Voter registration has been invalidated |

### History Structure (JSON)

Each entry in the `history` array:

```json
{
  "action_type": "registered | approved | flagged | invalidated | voted",
  "actor": "user-id-who-performed-action",
  "timestamp": 1234567890000,
  "email_data": { ... }
}
```

### Email Data Structure (JSON)

```json
{
  "inviteResponse": {
    "status": "sent",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "reminderResponse": {
    "status": "sent",
    "timestamp": "2024-01-05T00:00:00Z"
  }
}
```

---

## ballotDB

Stores all submitted ballots and their votes.

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `ballot_id` | `varchar` | No | Unique identifier for the ballot (part of composite PK) |
| `update_date` | `varchar` | No | Timestamp of last update (part of composite PK) |
| `election_id` | `varchar` | Yes | Reference to the election |
| `user_id` | `varchar` | Yes | Reference to the user who cast the ballot |
| `status` | `varchar` | Yes | Ballot status: `saved`, `submitted` |
| `date_submitted` | `varchar` | Yes | Unix timestamp when ballot was submitted |
| `ip_hash` | `varchar` | Yes | Hashed IP address for duplicate detection |
| `votes` | `json` | No | Array of vote objects (see structure below) |
| `history` | `json` | Yes | Array of actions taken on this ballot |
| `precinct` | `varchar` | Yes | Voter's precinct |
| `create_date` | `varchar` | No | Timestamp when ballot was created |
| `head` | `boolean` | No | `true` for current version, `false` for historical |

### Primary Key

Composite key: `(ballot_id, update_date)`

### Vote Structure (JSON)

Each entry in the `votes` array represents votes for a single race:

```json
{
  "race_id": "unique-race-id",
  "scores": [
    {
      "candidate_id": "candidate-1",
      "score": 5
    },
    {
      "candidate_id": "candidate-2",
      "score": 3
    }
  ]
}
```

Score values depend on the voting method:
- **STAR/STAR_PR**: 0-5
- **Approval/Plurality**: 0-1
- **IRV/STV/RankedRobin**: 1 to N (ranking position)

### Ballot History Structure (JSON)

```json
{
  "action_type": "created | updated | submitted",
  "actor": "user-id",
  "timestamp": 1234567890000
}
```

---

## Database Migrations

Database migrations are managed using Kysely and are located in `packages/backend/src/Migrations/`. 

### Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `2023_07_03_Initial` | 2023-07-03 | Creates initial tables: `electionDB`, `electionRollDB`, `ballotDB` |
| `2024_01_27_Create_Date` | 2024-01-27 | Adds `claim_key_hash`, `is_public`, `create_date` to elections; replaces `ip_address` with `ip_hash` |
| `2024_01_29_pkeys_and_heads` | 2024-01-29 | Implements temporal versioning with composite primary keys and `head` column |
| `2025_01_29_admin_upload` | 2025-01-29 | Adds `ballot_source` and `public_archive_id` columns; removes obsolete `support_email` |

### Running Migrations

To run pending migrations:

```bash
npm run build -w @equal-vote/star-vote-backend
npm run migrate:latest -w @equal-vote/star-vote-backend
```

### Creating New Migrations

To create a new migration, add a new file in `packages/backend/src/Migrations/` following the naming convention `YYYY_MM_DD_Description.ts`:

```typescript
import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Migration logic here
  await db.schema.alterTable('tableName')
    .addColumn('new_column', 'varchar')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Rollback logic here
  await db.schema.alterTable('tableName')
    .dropColumn('new_column')
    .execute()
}
```

---

## Entity Relationships

```
┌─────────────────┐         ┌──────────────────┐
│   electionDB    │         │  electionRollDB  │
├─────────────────┤         ├──────────────────┤
│ election_id (PK)│◄────────│ election_id (FK) │
│ ...             │         │ voter_id (PK)    │
│ races (JSON)    │         │ ballot_id (FK)   │◄───┐
│ settings (JSON) │         │ ...              │    │
└─────────────────┘         └──────────────────┘    │
                                                     │
                            ┌──────────────────┐    │
                            │     ballotDB     │    │
                            ├──────────────────┤    │
                            │ ballot_id (PK)   │────┘
                            │ election_id (FK) │
                            │ votes (JSON)     │
                            │ ...              │
                            └──────────────────┘
```

---

## Data Types Reference

### Uid

All ID fields (`election_id`, `ballot_id`, `voter_id`, `race_id`, `candidate_id`) are strings. The system generates UUIDs for most IDs, but custom slugs can be used for election IDs.

### Timestamps

- `create_date`: ISO 8601 format string (e.g., `"2024-01-15T10:30:00.000Z"`)
- `update_date`: Milliseconds since Unix epoch as string (e.g., `"1705315800000"`)
- `date_submitted`: Unix timestamp in milliseconds

### Boolean Fields

PostgreSQL boolean type (`true`/`false`)

### JSON Fields

Stored as PostgreSQL JSON type. All JSON structures are validated at the application level using TypeScript interfaces defined in `packages/shared/src/domain_model/`.

---

## Querying Best Practices

### Always Filter by `head = true`

To get the current version of any record, always include `WHERE head = true`:

```sql
SELECT * FROM electionDB 
WHERE election_id = 'my-election' 
AND head = true;
```

### Temporal Queries

To see the history of changes:

```sql
SELECT * FROM electionDB 
WHERE election_id = 'my-election' 
ORDER BY update_date DESC;
```

### Performance Considerations

- The `electionDB_head` index optimizes queries filtering by `head`
- For large voter rolls, consider paginating queries on `electionRollDB`
- JSON columns are not indexed; if you need to query JSON fields frequently, consider adding computed columns or GIN indexes
