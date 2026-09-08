# Dual-gate submission-channel design: role permission + election setting, checked independently

## Problem

The ballot-upload pipeline needs two distinct controls simultaneously:

1. **Who may upload** — only election owners and system admins should ever be able to bulk-upload ballots into an election. This is already enforced by the existing `canUploadBallots` role permission.
2. **Whether this election allows it** — an election owner should be able to configure, per election, whether paper-ballot admin upload is an accepted submission channel. Without this, the role permission is either too permissive (every owner can inject ballots into any election they own, even one they never intended to accept paper ballots for) or too restrictive (locking out the pattern entirely unless the owner is a system admin).

The straightforward alternatives both fail:

- **Merge both controls into the role permission alone** — gives every election owner the ability to upload ballots for any election they own, with no per-election opt-in. An owner who set up an online-only election would have no way to prevent admin ballot injection into it.
- **Merge both controls into the election setting alone** — means a non-owner filling in for the owner (e.g. a system admin assisting with a batch upload) would be blocked the moment the setting isn't tailored to them specifically. Role-based access control is the right tool for "who may do this at all."

## Decision

Use two independent checks rather than collapsing them into one:

- **`canUploadBallots` role permission** (already existing, unchanged) — answers "is this user allowed to upload ballots at all?" System admins and election owners pass; everyone else is rejected before any other check runs.
- **`allowed_submit_types` election setting** (new, on `ElectionSettings`) — answers "does this election accept paper-ballot admin upload as a channel?" Checked in the ballot-submission pipeline after the role gate, rejecting with a 400 if the incoming submission type isn't in the election's configured set.

Passing both gates is required to upload a ballot. Neither replaces the other. The setting is evaluated with a runtime fallback (`election.settings.allowed_submit_types ?? DEFAULT_ALLOWED_SUBMIT_TYPES`) so that elections created before the field existed behave consistently — paper-ballot upload is **off by default**; online browser submission and (future) Discord are on by default.

The setting is locked once the election leaves draft, so the submission-channel rules can't change after voting has started.

## Why independent rather than merged

The two checks answer categorically different questions. A role permission governs identity ("is this principal trusted to perform this class of action?"). An election setting governs policy ("has this election been configured to allow this class of input?"). Merging them into one check would conflate identity and policy in a way that makes the system harder to reason about and creates edge cases:

- If only the role gate existed, every election owner could upload ballots into any of their elections regardless of whether paper-ballot intake was ever intended — silently.
- If only the election setting existed, a system admin helping upload into an election that has the setting enabled would need the setting to somehow encode their identity separately. That's what role-based access control is for.

Keeping the gates independent also means each gate can change independently: the role permission can be broadened or narrowed (e.g. delegated per-election to a designated ballot-handler role) without touching the election-settings schema, and the election setting can gain new channel types (Discord, future channels) without touching role-permission logic.
