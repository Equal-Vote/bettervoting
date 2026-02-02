---
layout: default
title: 🔌 Backend API Reference
nav_order: 5
parent: 💻 Developers
---

# Backend API Reference

This document provides a complete reference of all backend API endpoints available in BetterVoting. All endpoints are prefixed with `/API`.

> **Interactive Documentation**: The backend also provides auto-generated Swagger documentation at `/API/Docs` when running locally.

## Authentication

Many endpoints require authentication via a JWT token stored in a cookie named `id_token`. Endpoints that require authentication are marked with 🔐.

## Base URL

- **Local Development**: `http://localhost:5000/API`
- **Production**: `https://bettervoting.com/API`

---

## Elections Endpoints

### Get Election by ID

Retrieves a specific election by its unique identifier.

```
GET /Election/{id}
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns the election object

---

### Check if Election Exists

Checks whether an election with the given ID exists.

```
GET /Election/{id}/exists
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns `{ exists: boolean }`

---

### Claim Election 🔐

Claims an election that was created without an account.

```
POST /Election/{id}/claim
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "claim_key": "string"
}
```

**Response:** `200 OK` - Returns success status

---

### Delete Election 🔐

Deletes an election by its ID.

```
DELETE /Election/{id}
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Election deleted

---

### Get All Elections 🔐

Retrieves all elections associated with the authenticated user.

```
GET /Elections
```

**Response:** `200 OK` - Returns an object with categorized elections:
```json
{
  "elections_as_official": [...],
  "elections_as_unsubmitted_voter": [...],
  "elections_as_submitted_voter": [...],
  "open_elections": [...]
}
```

---

### Create Election

Creates a new election.

```
POST /Elections
```

**Request Body:**
```json
{
  "Election": {
    "title": "string",
    "description": "string",
    "races": [...],
    "settings": {...}
  }
}
```

**Response:** `200 OK` - Returns the created election object

---

### Query Elections 🔐 (Admin Only)

Queries elections based on time range. Restricted to system administrators.

```
POST /QueryElections
```

**Request Body:**
```json
{
  "start_time": "ISO 8601 date",
  "end_time": "ISO 8601 date"
}
```

**Response:** `200 OK` - Returns categorized elections and vote counts

---

### Get Global Election Statistics

Retrieves global statistics about elections.

```
GET /GlobalElectionStats
```

**Response:** `200 OK`
```json
{
  "elections": 123,
  "votes": 4567
}
```

---

### Edit Election 🔐

Edits an existing election.

```
POST /Election/{id}/edit
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "Election": {
    // Election fields to update
  }
}
```

**Response:** `200 OK` - Returns updated election and voter authorization info

---

### Edit Election Roles 🔐

Edits the roles (admins, auditors, credential managers) for an election.

```
PUT /Election/{id}/roles
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "admin_ids": ["email1@example.com", "email2@example.com"],
  "audit_ids": ["email3@example.com"],
  "credential_ids": ["email4@example.com"]
}
```

**Response:** `200 OK` - Returns updated election object

---

### Get Election Results 🔐

Retrieves the results of an election.

```
GET /ElectionResult/{id}
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns election and results objects

---

### Finalize Election 🔐

Finalizes an election, making it ready for voting.

```
POST /Election/{id}/finalize
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns finalized election object

---

### Set Public Results 🔐

Sets whether election results are publicly visible.

```
POST /Election/{id}/setPublicResults
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "public_results": true
}
```

**Response:** `200 OK` - Returns updated election object

---

### Archive Election 🔐

Archives an election.

```
POST /Election/{id}/archive
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns archived election object

---

### Set Open State 🔐

Opens or closes an election for voting.

```
POST /Election/{id}/setOpenState
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "open": true
}
```

**Response:** `200 OK` - Returns updated election object

---

### Send Invitations 🔐

Sends invitations to all voters on the election roll.

```
POST /Election/{id}/sendInvites
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Invitations sent

---

### Send Emails 🔐

Sends emails to voters on the election roll.

```
POST /Election/{id}/sendEmails
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Emails sent

---

### Send Invitation to Specific Voter 🔐

Sends an invitation to a specific voter.

```
POST /Election/{id}/sendInvite/{voter_id}
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |
| voter_id | path | string | Yes | The voter ID |

**Response:** `200 OK` - Returns updated election roll entry

---

### Sandbox Results

Calculates election results for a sandbox/test scenario.

```
POST /Sandbox
```

**Request Body:**
```json
{
  "cvr": [[1,2,3], [3,2,1]],
  "candidates": ["Alice", "Bob", "Charlie"],
  "num_winners": 1,
  "votingMethod": "STAR"
}
```

**Response:** `200 OK` - Returns calculated results

---

### Upload Image

Uploads an image for use in elections.

```
POST /images
```

**Content-Type:** `multipart/form-data`

**Request Body:**
| Name | Type | Description |
|------|------|-------------|
| file | binary | The image file to upload |

**Response:** `200 OK` - Returns `{ photo_filename: "string" }`

---

## Ballot Endpoints

### Get Ballots by Election 🔐

Retrieves all ballots for a specific election.

```
GET /Election/{id}/ballots
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns election and array of ballots

---

### Get Anonymized Ballots

Retrieves anonymized ballots for an election (no voter identification).

```
GET /Election/{id}/anonymizedBallots
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns array of anonymized ballots

---

### Delete All Ballots 🔐

Deletes all ballots for an election.

```
DELETE /Election/{id}/ballots
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns `{ success: boolean }`

---

### Get Ballot by ID

Retrieves a specific ballot by its ID.

```
GET /Election/{id}/ballot/{ballot_id}
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |
| ballot_id | path | string | Yes | The ballot ID |

**Response:** `200 OK` - Returns the ballot object

---

### Cast Vote 🔐

Casts a vote in an election.

```
POST /Election/{id}/vote
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "ballot": {
    "election_id": "string",
    "votes": [
      {
        "race_id": "string",
        "scores": [
          { "candidate_id": "string", "score": 5 }
        ]
      }
    ]
  },
  "recieptEmail": "voter@example.com"
}
```

**Response:** `200 OK` - Returns the submitted ballot

---

### Upload Ballots 🔐

Bulk uploads ballots for an election (admin use).

```
POST /Election/{id}/uploadBallots
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "race_order": [
    {
      "race_id": "string",
      "candidate_id_order": ["id1", "id2"]
    }
  ],
  "ballots": [
    {
      "voter_id": "string",
      "ballot": { ... }
    }
  ]
}
```

**Response:** `200 OK` - Returns array of ballot submission statuses

---

## Election Roll Endpoints

### Register Voter

Registers a voter for an election.

```
POST /Election/{id}/register
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns election and new election roll entry

---

### Get Rolls by Election 🔐

Retrieves the voter roll for an election.

```
GET /Election/{id}/rolls
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns election roll entries

---

### Get Roll by Voter ID 🔐

Retrieves a specific voter's roll entry.

```
GET /Election/{id}/rolls/{voter_id}
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |
| voter_id | path | string | Yes | The voter ID |

**Response:** `200 OK` - Returns the election roll entry

---

### Add Election Roll 🔐

Adds voters to the election roll.

```
POST /Election/{id}/rolls
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "electionRoll": [
    {
      "voter_id": "string",
      "email": "voter@example.com",
      "precinct": "string"
    }
  ]
}
```

**Response:** `200 OK` - Returns updated election and roll entry

---

### Edit Election Roll 🔐

Edits an existing election roll entry.

```
PUT /Election/{id}/rolls
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Response:** `200 OK` - Returns updated election roll entry

---

### Approve Election Roll 🔐

Approves a voter's registration.

```
POST /Election/{id}/rolls/approve
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "electionRollEntry": {
    "voter_id": "string",
    "election_id": "string"
  }
}
```

**Response:** `200 OK` - Roll approved

---

### Flag Election Roll 🔐

Flags a voter's registration for review.

```
POST /Election/{id}/rolls/flag
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "electionRollEntry": {
    "voter_id": "string",
    "election_id": "string"
  }
}
```

**Response:** `200 OK` - Roll flagged

---

### Invalidate Election Roll 🔐

Invalidates a voter's registration.

```
POST /Election/{id}/rolls/invalidate
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "electionRollEntry": {
    "voter_id": "string",
    "election_id": "string"
  }
}
```

**Response:** `200 OK` - Roll invalidated

---

### Unflag Election Roll 🔐

Removes a flag from a voter's registration.

```
POST /Election/{id}/rolls/unflag
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "electionRollEntry": {
    "voter_id": "string",
    "election_id": "string"
  }
}
```

**Response:** `200 OK` - Roll unflagged

---

### Reveal Voter ID by Email 🔐 (Emergency)

🚨 **EMERGENCY BREAK GLASS** - Reveals voter ID by email address. This endpoint creates a prominent audit log entry and should only be used in emergency situations.

```
POST /Election/{id}/rolls/revealVoterId
```

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| id | path | string | Yes | The election ID |

**Request Body:**
```json
{
  "email": "voter@example.com"
}
```

**Response:** `200 OK`
```json
{
  "voter_id": "string",
  "email": "string",
  "warning": "This action has been logged"
}
```

---

## Debug Endpoints

### Health Check

Basic health check endpoint.

```
GET /
```

**Response:** `200 OK` - Returns current timestamp

---

### Test Suite

Runs the temporary test suite.

```
GET /test
```

**Response:** `200 OK` - Returns test results

---

## Error Responses

All endpoints may return the following error responses:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error |

Error response body:
```json
{
  "error": "Error message description"
}
```
