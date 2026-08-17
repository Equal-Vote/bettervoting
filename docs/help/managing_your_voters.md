---
layout: default
title: Managing Your Voters
nav_order: 11
parent: BetterVoting Documentation
---

# Managing Your Voters

If your election is restricted to a pre-defined voter list, the **Voters** tab on your election's admin page is where you manage that list: add voters, send them email invitations and reminders, track who has voted, and help voters who can't find their voting link.

This article covers the day-to-day operations of the voter list. For choosing between an email list and an ID list in the first place — and the rest of BetterVoting's security spectrum — see [Security Options](security_options.md).

## The two kinds of voter list

- **Email list** (BetterVoting-managed voter IDs): You provide each voter's email address. BetterVoting creates a private voting link for each voter, which you send out by email from the Voters tab. This is the recommended option for maximizing security.
- **ID list** (admin-managed voter IDs): You provide the voter IDs yourself and distribute them to voters however you like. Voters enter their ID (or use their unique link) to access their ballot.

{: .important }
> Once you add your first voters, the voter list settings lock in for the election — you can no longer switch between open and restricted, or between email list and ID list. While the election is still in draft, the **Clear Voter List** button removes every voter and unlocks the settings so you can change them and start over. After the election leaves draft, the list can no longer be cleared.

## Adding voters

Click **Add Voters** on the Voters tab. You can add voters two ways:

- **Type or paste them in** — one voter per row, with no spaces. For an email list election, each row is just an email address. For an ID list election, check off which fields you're providing (Voter ID, Email) and give the values comma-separated in that order:

  ```
  A1001,alice@example.com
  A1002,bob@example.com
  ```

- **Upload a CSV file** — the first row must be a header naming the columns, and the column names must be exactly `voter_id` and/or `email`:

  ```
  voter_id,email
  A1001,alice@example.com
  A1002,bob@example.com
  ```

A few rules to know:

- **Duplicates are not allowed.** If your list contains duplicate emails, BetterVoting offers to remove them for you. Voters who are already on the list are rejected as duplicates — you'll see a count of how many rows were already present.
- **Email list elections can't take custom voter IDs.** BetterVoting generates and manages the IDs itself; submitting your own IDs is rejected.
- **Private elections are limited to 100 voters** on the free tier. If you need more, email [elections@equal.vote](mailto:elections@equal.vote) for an override.
- **You can add voters at any time**, including after the election is finalized or already open. Late additions join the list normally and can be sent their invitation individually.

## What the voter list shows you

The Voters tab lists every voter with their email, and a **Has Voted** column showing *Voted* or *Not Voted*. The columns are sortable and filterable, so you can pull up just the voters who haven't voted yet. For ID list elections the table also shows each voter's ID.

Click any voter to open their details:

- **Has Voted** and the voter's current review state.
- **Email invite status** — whether their invitation has been sent, succeeded, or failed (email list elections).
- **Email Delivery Events** — a per-voter timeline from the email provider: *sent*, *processed*, *delivered*, *open*, *bounce*, *dropped*, *deferred*, *spam report*. This is how you tell "we never sent it" apart from "their inbox bounced it" (email list elections).
- **Action history** — an audit trail of everything that has happened to this voter's entry: when they were added and by whom, each email sent, each state change, and any time their voting link was revealed.

{: .note }
> You can see *whether* each voter has voted, but not *how* they voted. The link between a voter and their ballot is hidden from election admins — and for email list elections, even the system-generated voter IDs are hidden from the voter list view. See the ballot secrecy FAQ in [Security Options](security_options.md).

### Who can do what

If you've added helpers through election roles, their access to the voter list is:

| Action | Owner | Admin | Auditor | Credentialer |
|---|---|---|---|---|
| View the voter list | ✓ | ✓ | ✓ | ✓ |
| Add voters | ✓ | ✓ | | |
| Clear the list (draft only) | ✓ | ✓ | | |
| Send emails | ✓ | ✓ | | |
| Approve a voter | ✓ | ✓ | | ✓ |
| Flag a voter | ✓ | ✓ | ✓ | ✓ |

## Voter review states

Every voter you add starts out **approved**. If something about an entry needs a second look — a disputed registration, a suspected duplicate — the voter can be **flagged** for review, and after review either approved again or marked **invalid**. Every state change is recorded in the voter's action history with who made it and when.

{: .note }
> The flag/invalidate workflow is currently a beta feature — the buttons appear once the corresponding feature flag is enabled. See [How to enable beta features](how_to_enable_beta_features.md).

## Emailing your voters

For email list elections, the Voters tab includes the email tools. (ID list elections don't send email — you distribute the IDs yourself.)

{: .important }
> **Nothing is sent until you send it.** Finalizing your election does not automatically email your voters — after you finalize, BetterVoting offers to take you to the Voters tab so you can send the invitation blast yourself. Until you do, your voters have not been notified.

Click **Draft Email Blast** to compose a message:

1. **Pick a template** — the *Invitation Template* (election title, description, voting start/end times, and each voter's unique Vote button) or an *Empty Template* you write from scratch.
2. **Edit the subject and body.** The body supports `**bold**`, `[link text](url)`, and two placeholders: `__VOTE_BUTTON__` inserts each recipient's unique voting button, and `__ELECTION_HOME_BUTTON__` inserts a shareable link to the election's public page.
3. **Send yourself a test.** The *Send Test* button emails the draft to any comma-separated addresses you list, with `[Test Email]` prefixed to the subject, without touching your voters.
4. **Choose the audience** — *All voters*, *Only those who have ALREADY voted*, or *Only those who have NOT voted*.
5. **Send.** The send button shows exactly how many voters will receive the blast.

You can send as many blasts as you like, at any point in the election:

- **Reminders**: target *Only those who have NOT voted* while voting is open.
- **Results announcements**: after the election closes, send a blast with a link to the results.
- **Individual emails**: open a single voter's details and click **Draft Email** to message just that voter — useful for resending a lost invitation.

The compose dialog warns you if the timing is off: if the election is still in draft (votes cast now are test votes and will be cleared when you finalize — and the email itself carries a test-mode banner), if voting hasn't started yet, or if voting has already ended.

After voting, each voter automatically receives a ballot receipt email confirming their ballot was counted, with a link to verify it.

## When a voter never receives their email

First, open the voter's details and check the **Email Delivery Events**. A *bounce* or *dropped* event means the address is wrong or rejecting mail; a *delivered* event with no *open* usually means it's sitting in a spam folder.

If resending (the single-voter **Draft Email** button) doesn't get through, you can hand the voter their voting link directly:

- **ID list elections**: click **Copy Unique Voting URL** in the voter's details, and share it with the voter through any channel you trust.
- **Email list elections**: voting links are deliberately hidden, so the button reads **Obtain Unique Voting URL** and asks you to confirm. Confirming reveals and copies the voter's unique link — and writes a permanent entry in the audit log recording who revealed it and when. The entry also appears in that voter's action history.

{: .warning }
> A voting URL is a live credential — anyone holding it can cast that voter's ballot. Only reveal a link at the voter's own request, deliver it directly to that voter, and never share it in a group channel.

## What you can still do after finalizing

Finalizing locks the election itself — races, candidates, and settings can no longer be edited. The voter list stays operational:

- Add new voters and send them their invitations.
- Send blasts and reminders to any audience.
- Track voting progress and email delivery.
- Change voter review states.
- Reveal a voting URL for a voter who can't receive email.

What you *can't* do after leaving draft is clear the voter list or change the voter list settings — those are locked in with your first voters and only unlockable while drafting.
