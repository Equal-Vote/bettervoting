---
layout: default
title: 🔧 Backend Developer Guide
nav_order: 5
parent: 💻 Developers
has_children: true
---

# Backend Developer Guide

Welcome to the comprehensive backend documentation for BetterVoting. This documentation covers everything you need to understand and work with the BetterVoting backend system.

## Documentation Structure

The backend documentation is organized into the following sections:

### Core Concepts

| Document | Description |
|----------|-------------|
| [Domain Models](./domain-models) | Complete reference for all data structures (Election, Ballot, ElectionRoll, etc.) |
| [Authentication & Authorization](./authentication) | How users are identified, roles, permissions, and access control |
| [Election Lifecycle](./election-lifecycle) | Election states, transitions, and what each state means |

### Operations

| Document | Description |
|----------|-------------|
| [Voting Flow](./voting-flow) | Everything about casting votes: validation, authorization, processing |
| [Election Roll Management](./election-roll-management) | Managing voters: adding, approving, flagging, and the complete workflow |
| [API Endpoints](./api-endpoints) | Complete API reference with database operations |

---

## Quick Overview

### What is BetterVoting?

BetterVoting is an online voting platform supporting multiple voting methods including STAR Voting, Approval Voting, Ranked Choice (IRV), and more. It handles:

- **Election Creation & Management**: Create polls and elections with customizable settings
- **Voter Authentication**: Multiple methods including email verification, voter IDs, IP tracking
- **Vote Collection**: Secure ballot submission with duplicate prevention
- **Result Tabulation**: Real-time or delayed results using various voting algorithms

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                            │
│                         packages/frontend/                               │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ HTTP/REST API
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Backend (Express.js)                           │
│                         packages/backend/                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Routes    │  │ Controllers │  │   Models    │  │  Services   │    │
│  │ /API/*      │  │  Business   │  │ Database    │  │ Email, Auth │    │
│  │             │  │  Logic      │  │ Operations  │  │ Job Queue   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
            │  PostgreSQL │   │   Keycloak  │   │   AWS S3    │
            │  (Data)     │   │   (Auth)    │   │  (Images)   │
            └─────────────┘   └─────────────┘   └─────────────┘
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **Express.js** | Web framework for API endpoints |
| **Kysely** | Type-safe SQL query builder (ORM) |
| **PostgreSQL** | Primary database for elections, ballots, rolls |
| **Keycloak** | User authentication and identity management |
| **pg-boss** | Job queue for async operations (emails, vote processing) |
| **SendGrid** | Email delivery for invitations and receipts |
| **AWS S3** | Image storage for candidate photos |

### Database Tables

The system uses three main tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `electionDB` | Stores elections with all settings, races, candidates | `election_id`, `state`, `races`, `settings` |
| `electionRollDB` | Voter registry - who can vote, who has voted | `voter_id`, `election_id`, `submitted`, `state` |
| `ballotDB` | Submitted ballots with votes | `ballot_id`, `election_id`, `votes` |

All tables use **temporal versioning** - every update creates a new row with `head=true` and sets the old version to `head=false`, preserving complete history.

### Request Flow Example

Here's what happens when a voter casts a vote:

```
1. POST /API/Election/{id}/vote
   │
   ├── 2. getElectionByID middleware
   │      └── Loads election from electionDB WHERE head=true
   │
   ├── 3. electionSpecificAuth middleware  
   │      └── Checks election-specific auth key if set
   │
   ├── 4. electionPostAuthMiddleware
   │      ├── Updates election state if start/end time passed
   │      └── Determines user's roles (owner, admin, etc.)
   │
   └── 5. castVoteController
          ├── Verify election is open or draft
          ├── Check voter authentication requirements
          ├── Get/create election roll entry
          ├── Validate voter is authorized
          ├── Validate ballot structure and scores
          ├── Queue vote event (pg-boss)
          └── Return scrubbed ballot (no ballot_id)
                │
                └── 6. handleCastVoteEvent (async)
                       ├── Save ballot to ballotDB
                       ├── Update roll entry (submitted=true)
                       └── Send receipt email if requested
```

---

## Getting Started

To work on the backend:

1. **Set up locally** - Follow the [Local Setup Guide](../1_local_setup)
2. **Understand the data** - Read [Domain Models](./domain-models)
3. **Understand auth** - Read [Authentication & Authorization](./authentication)
4. **Find the endpoint** - See [API Endpoints](./api-endpoints)

## Code Organization

```
packages/backend/src/
├── Routes/               # API route definitions
│   ├── elections.routes.ts
│   ├── ballot.routes.ts
│   └── roll.routes.ts
├── Controllers/          # Business logic
│   ├── Election/         # Election operations
│   ├── Ballot/           # Ballot operations
│   └── Roll/             # Voter roll operations
├── Models/               # Database operations (Kysely)
│   ├── Elections.ts
│   ├── Ballots.ts
│   └── ElectionRolls.ts
├── Services/             # External integrations
│   ├── Email/            # SendGrid integration
│   └── Logging/          # Logging utilities
├── Migrations/           # Database schema changes
└── Tabulators/           # Vote counting algorithms
```
