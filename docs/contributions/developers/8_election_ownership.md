---
layout: default
title: 👤 Election Ownership, Temporary Access and Claim Keys
nav_order: 8
parent: 💻 Developers
grand_parent: Contribution Guide
---

# Election Ownership, Temporary Access and Claim Keys

This page is a high-level overview of who owns an election, how someone
without an account can work on one for a short time, and how they turn that
into permanent ownership. For how voters are identified see
[Voter Authentication Modes](6_voter_authentication_modes.html); for
integrations that manage elections with their own key see
[Per-Election `auth_key`](7_auth_key.html).

## Owners

Every election has at most one **owner**. The owner can edit the election
while it is a draft, finalize it, open and close it, approve write-ins,
manage the voter list, archive or delete it, and grant other people
admin, auditor or credentialer roles by email.

There are three kinds of election:

- **Owned by an account.** The owner is a signed-in user. They keep
  ownership permanently, and the election appears in their elections list.
- **Temporarily owned.** Created by someone who isn't signed in. Only the
  browser that created it can manage it, and only for a limited time (see
  below).
- **Ownerless.** Nobody is the owner, so nobody can manage it from the web
  UI. Elections from the wizard's "Publish Now" button and most elections
  created through the API are ownerless.

## Temporary ownership

When someone who isn't signed in starts an election in the wizard and
chooses to keep editing, the browser is given a random temporary identity,
and the election records that identity as its owner. For a limited window
after creation, that browser is treated as the owner and can keep drafting.

Temporary ownership is deliberately weak:

- It only works from the browser that created the election, and is lost if
  that browser's cookies are cleared.
- It expires a fixed number of hours after the election is created
  (`TEMPORARY_ACCESS_HOURS` in the shared config).
- A temporary owner can't finalize the election. They need to sign in
  first.

While temporary access is active, the admin pages show a banner asking the
user to sign in.

## Claiming an election

When the wizard creates an election it also generates a secret **claim
key**. The browser keeps the key, and the election stores only a hash of
it.

If the temporary owner signs in while their access is still active, the
frontend sends the claim key to the backend. The backend checks that the
caller is currently the owner, is now signed in, and holds the right key,
and then makes their account the permanent owner. This is the only way an
election's owner ever changes after it is created.

Once temporary access has expired the election can no longer be claimed.

## Publish Now

The wizard's "Publish Now" button creates an ownerless election that opens
immediately, whether or not the user is signed in. It can't be edited,
closed or managed afterwards, and it doesn't appear in anyone's elections
list. The wizard's info bubble warns users about this and points them to
the full editor if they want to keep control.

## Elections created through the API

Integrations that create elections through the API usually have no
BetterVoting account to name as the owner, so their elections are
ownerless. They manage the election with a per-election key instead (see
[Per-Election `auth_key`](7_auth_key.html)). Anything that requires the
owner in the web UI, such as approving write-in candidates, isn't
available for these elections.

## What can't be recovered

There is no admin override for ownership. An ownerless election, or a
temporary election whose access has expired, can't be taken over through
the app. Fixing one requires a direct database change.
