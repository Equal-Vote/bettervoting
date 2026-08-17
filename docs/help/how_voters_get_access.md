---
layout: default
title: How Voters Get Access
nav_order: 10
parent: BetterVoting Documentation
---

# How Voters Get Access

Every BetterVoting election is one of two types: **open**, where anyone with the ballot link can vote, or **restricted**, where only people on a voter list can vote. That choice — together with the security level the election administrator picked — determines exactly what you'll be asked for before you can cast a ballot.

This page explains what voters experience under each setting, and what each setting asks of your voters if you're the one running the election. For help *choosing* between these options, see [Security Options](security_options.md).

## Open elections: anyone with the link

In an open election, the administrator shares one ballot link with everyone (public elections are also listed on the Browse Polls page). What happens when you arrive depends on the election's security level:

| Security level | What you're asked for | What prevents a second ballot |
|---|---|---|
| One vote per device | Nothing | Your browser is remembered with a cookie — one ballot per browser |
| One vote per user | Sign in to a free BetterVoting account with a verified email address | One ballot per account |
| One vote per network | Nothing | One ballot per internet connection (your network address, stored as a one-way hash) |
| No voting limit | Nothing | Nothing — every submission is counted |

Some things worth knowing about each:

- **One vote per device** requires your browser to accept cookies. Voting from a different browser, a different device, or after clearing cookies makes you a new voter as far as the election can tell — this level is designed for convenience with basic protection, not strict enforcement.
- **One vote per user** shows *"You must log in to access this election"* until you sign in. Creating an account is free; the Vote button appears once you're logged in.
- **One vote per network** treats everyone sharing an internet connection as one voter. If a housemate or coworker on the same network has already voted, the election shows the ballot as already submitted — this is the setting working as designed, not an error.
- **No voting limit** is meant for demos and for groups passing one shared device around. Every ballot submitted is counted.

{: .note }
> These are the only combinations BetterVoting offers — an election checks exactly one of these things, never several at once.

## Restricted elections: a voter list

In a restricted election, the administrator creates a voter list before voting starts, and only people on that list can cast a ballot. Having the ballot link is not enough — each voter also needs their **voter ID**, a credential that matches one entry on the list. There are two ways elections manage these IDs:

### Email list: your ID arrives in a private voting link

The administrator enters each voter's email address, and BetterVoting generates a private voter ID for each one. When the election opens, you receive an email with a voting button — your ID is built into that unique link, so you never have to type anything. Click the button, and your ballot opens with your identity already confirmed. The election page shows your voter ID mostly masked, as a confirmation that your link worked.

{: .warning }
> Your voting link is unique to you. Anyone you share it with can cast **your** ballot — treat it like a password, and don't forward the email.

If your email never arrives, contact the election administrator — they can resend it, or securely retrieve your unique link and deliver it to you another way. (That retrieval is recorded in the election's audit log.)

### ID list: you type your ID in

The administrator creates the voter IDs themselves — a membership number, for example — and distributes them alongside the shared ballot link. When you open the link, the election page shows a **Voter ID** field. Enter your ID (it's masked like a password) and press Submit:

- If the ID matches the voter list, the Vote button appears.
- If it doesn't, you'll see *"Invalid Voter ID"* — check for typos, and contact the administrator if you're sure the ID is right.

Your ID is remembered on that device for a day, and a Clear button lets you remove it — useful when several voters share one computer.

## One ballot per voter — and changing your vote

In every mode except *No voting limit*, you get one ballot. After you submit, the election page shows **Ballot Submitted** and the Vote button is gone; a repeat submission is rejected.

There is one exception: an email-list restricted election can enable **ballot updates**. When it's on, returning through your unique voting link shows an **Update Vote** button instead, and submitting again replaces your earlier ballot. However many times you revise it, only your latest ballot is counted, and it still counts exactly once. Ballot updates are only available on email-list elections — open elections and ID-list elections can't offer them.

If you provided or confirmed an email address, you'll also receive an email receipt confirming your ballot was counted.

{: .note }
> While an election is still being drafted, the ballot page is in test mode: anyone with the link can submit practice ballots, and all of them are erased before the real election starts.

## Why can't I vote? (Quick reference)

| What you see | What it means | What to do |
|---|---|---|
| *"You must log in to access this election"* | This election requires a BetterVoting account | Sign in, or create a free account |
| A Voter ID field | This election is restricted to a voter list | Enter the voter ID you were given |
| *"Invalid Voter ID"* | The ID you entered isn't on the voter list | Re-check it; contact the administrator |
| *"You are not authorized to vote in this election"* | Your credentials don't match the voter list | Contact the administrator |
| **Ballot Submitted**, no Vote button | Your ballot is already in | Nothing — you're done (unless ballot updates are on) |
| A start time, no Vote button | The election hasn't opened yet | Come back after the start time |
| An end time in the past | Voting has ended | See the results, if they're published |

If the administrator provided a contact email, it appears on the election page — that's the right address for access problems, since only the administrator can see and fix the voter list.

## Notes for administrators

- **Tell your voters what to expect.** The single most common access question — "why is it asking me for an ID?" — is answered by one line in your announcement: whether your election is open or restricted, and where their ID or link comes from.
- **Your access settings are validated as a package.** The access type, the security level, and the invitation method are chosen together from the fixed set above; the server rejects any other combination, so there's no way to accidentally configure an election voters can't get into.
- **The voter list locks in your access settings.** Once you've added voters, the election's access settings can't change unless you clear the list and start over.
- **On restricted elections, you can track turnout.** The voter list shows who has voted and who hasn't, and email blasts can target only those who still need to vote.
- **Credentialing is up to you.** BetterVoting checks that each ballot matches an entry on your list — verifying that the list itself contains the right people, one entry per person, is your job before the election starts. See [Paper Ballots](paper_ballots.md) for credentialing recommendations.

Still stuck? Check the [FAQ](faq.md), or reach out to the team at elections@equal.vote.
