---
layout: default
title: Emails to Voters
nav_order: 15
parent: BetterVoting Documentation
---

# Emails to Voters

When you run an election with an email list, BetterVoting delivers your voters' unique voting links by email and confirms their votes with a receipt. This page explains which emails your voters receive, what triggers each one, and what to do when a voter never gets one.

{: .important }
> **You send the invitations — BetterVoting does not send them for you.** Finalizing your election does not email anyone. Nothing is sent automatically when the election starts, either. Voters receive their invitations only when you draft and send an email blast from the Voters tab. If you skip that step, your voters will never learn the election is open.

## The emails BetterVoting sends

There are two kinds:

1. **Email blasts** — messages you write and send yourself from the Voters tab: the initial invitation, reminders, and announcements. Each one can carry a button with the recipient's unique voting link.
2. **Ballot receipts** — sent automatically to each voter right after they cast a ballot.

That is the complete list. BetterVoting never emails your voters on its own schedule.

Email blasts require an election restricted to an email list — see [Security Options](security_options.md) for how to set that up. Ballot receipts are sent in any election, as long as the voter's email address is known.

## Sending an email blast

Open your election's **Voters** tab and select **Draft Email Blast**. You'll be asked which template to start with:

- **Invitation Template** — pre-filled with an invitation: your election's title and description, the voting start and end times (if you set them), a **Vote** button, and a warning that the link is unique to the voter.
- **Empty Template** — a blank message with a short guide to the link buttons.

The template is only a starting point; edit the subject and body freely before sending.

### Formatting and placeholders

The email body is plain text with a little formatting:

- `**bold text**` renders as **bold text**
- `[link text](url)` renders as a link
- A blank line starts a new paragraph
- `__VOTE_BUTTON__` becomes a **Vote** button. Each recipient's button carries their own unique voting link.
- `__ELECTION_HOME_BUTTON__` becomes a **View Election** button linking to the election's public page — useful when you want voters to see results rather than vote.

Any other HTML you type is stripped out for security.

### Choosing the audience

An email blast can target:

- **All voters**
- **Only those who have NOT voted** — for reminders as the deadline approaches
- **Only those who have ALREADY voted** — for example, to thank them or correct something

The send button shows how many voters will receive the message. You can send as many blasts as you like over the life of the election — a common pattern is invitation, then a reminder to non-voters, then a results announcement to everyone once the election closes.

You can also email a single voter: open that voter's entry on the Voters tab and select **Draft Email** there.

### Test sends

Before sending to real voters, use the **Test Email(s)** field at the top of the dialog. Enter one or more addresses (comma-separated — it starts pre-filled with your own) and select **Send Test**. The message arrives with `[Test Email]` added to the subject line so you can't confuse it with the real thing, and test sends are not recorded against any voter.

### Timing warnings

The dialog warns you before you send at an odd moment:

- **Election not finalized yet** — you can still send, but the email opens with a prominent test-mode warning to the voter (see below).
- **Start time in the future** — voters who click through can't cast a ballot yet.
- **End time already passed** — voters can no longer cast a ballot.

{: .warning }
> **Emails sent before finalizing carry a test-mode banner, and test ballots don't survive.** Any ballot cast while the election is still a draft is deleted when you finalize. The banner tells voters this, and their receipts repeat it — but plan on your testers voting again after you finalize, and send a fresh blast so real voting happens on the finalized election.

## Ballot receipts

When a voter submits a ballot, BetterVoting automatically emails them a receipt if it knows their address — from your email list, from their signed-in account, or from the optional receipt-email box on the ballot submission screen. The receipt:

- Thanks them for voting
- Links to a page where they can verify their ballot and check its status at any time
- If you enabled **Allow Voters To Edit Vote**, links to update their ballot while the election is open

Receipts for ballots cast before the election was finalized are marked as test ballots, with the same warning that they will be removed at finalization.

## Tracking delivery

Open a voter's entry on the Voters tab to see what happened to the emails you sent them. For email-list elections, each voter's entry shows **Email Delivery Events** — whether each message was sent, delivered, opened, deferred, bounced, dropped, or reported as spam — along with a history log recording each email sent to that voter, by whom, and when.

## When a voter never receives an email

Work through these in order:

1. **Check the delivery events** on the voter's entry. A bounce or drop usually means a typo in the address; a delivered-but-unseen message is usually sitting in a spam folder.
2. **Resend to just that voter** with the **Draft Email** button on their entry.
3. **Deliver the link directly.** Open the voter's entry and select **Obtain Unique Voting URL**. After you confirm, the voter's unique voting link is copied to your clipboard, and you can pass it to them over any channel you trust.

{: .note }
> Obtaining a voter's unique URL creates a permanent entry in the election's audit log recording who retrieved it and when. This keeps the escape hatch transparent: anyone reviewing the election later can see exactly which links were handed out manually. In elections using an ID list instead of an email list, the button is simply **Copy Unique Voting URL** and copies the link directly.

{: .warning }
> A unique voting URL is that voter's ballot access — anyone holding it can vote as that voter. Deliver it privately, and remind the voter not to forward it.

## What finalizing does — and doesn't — do

For emails, finalizing your election does exactly two things:

- **Deletes all test ballots** cast while the election was a draft, so testers must vote again
- **Offers you a shortcut** to the Voters tab so you can send your invitation blast

It does **not** send invitations, and no invitations are sent when the election's start time arrives. Treat "finalize, then send the invitation blast" as two steps of your launch checklist — both yours to do.
