---
layout: default
title: Voting Problems
nav_order: 14
parent: BetterVoting Documentation
---

# Voting Problems

This page is for voters. If something went wrong while you were trying to vote — an error message, a missing email, a link that doesn't seem to work — find your situation below.

One thing to know up front: **BetterVoting hosts the election, but the election organiser runs it.** The organiser controls who can vote, when voting opens and closes, and every other election setting. For anything specific to your election — whether you're on the voter list, why it hasn't opened, whether you can change your ballot — contact the organiser, not BetterVoting.

{: .note }
> Every error message ends with a short code in parentheses, for example `Error making request: 400: Election is not open (a1b2c3d4)`. When you report a problem, include that code — it lets the person helping you find exactly what happened.

## Quick reference

| The message you saw | What it means | What to do |
|---|---|---|
| `Election is not open` | Voting hasn't started yet, or has already ended. | Check the election page for the start and end times. Wait, or contact the organiser. |
| `User has already voted` | A ballot is already recorded for your voter ID, account, device, or network. | See [Already voted](#it-says-i-already-voted). |
| `Invalid Voter ID` | The ID you entered isn't on this election's voter list. | Re-enter it exactly as it was given to you, then contact the organiser. |
| `You are not authorized to vote in this election` | You're signed in, but your email address isn't on the voter list. | Contact the organiser and confirm which address they registered. |
| `You must log in to access this election` | This election requires a signed-in, email-verified account. | Click the log in link in that message and sign in. |
| `Voter ID Required for closed elections` | You submitted without entering a voter ID. | Enter your voter ID on the election page, or open your unique voting link. |
| `Voter ID does not match saved voter roll` | The ID you supplied doesn't match the voter record. | Check for typos and extra spaces; contact the organiser. |
| `Email does not match saved election roll` | You're signed in with a different email than the one on the voter list. | Sign in with the registered address, or ask the organiser to update it. |
| `IP Address does not match saved voter roll` | This election limits votes by network, and you're on a different network than before. | Reconnect to the network you first used, or contact the organiser. |
| `Temp ID is required for open elections with 'one vote per device' authentication` | This election uses a browser cookie to enforce one vote per device, and your browser isn't storing it. | Allow cookies for bettervoting.com, leave private/incognito mode, and reload. |
| `Concurrent edit detected, please retry.` | Two submissions touched the same record at the same moment. | Submit again. Nothing was lost. |
| **Test Mode** banner | The election is still being drafted. Your ballot is a test vote. | See [The Test Mode warning](#the-test-mode-warning). |
| `Election is Archived` | The organiser has archived the election. It no longer accepts votes. | Contact the organiser. |

## "Election is not open"

Ballots are only accepted while the election is open. If you submit before it opens or after it closes, you'll see `Election is not open`.

- An election with a scheduled start time opens automatically at that time. Until then the election page shows the start date (*"Election begins on …"*) and no Vote button.
- An election with a scheduled end time closes automatically at that time. Afterwards the page shows *"Election ended on …"*.
- An election with no end time stays open until the organiser closes it by hand.

If you had the ballot page open as the election ended, filling it out doesn't reserve your vote — only submitting counts. If your submission was rejected because time ran out, contact the organiser; only they decide whether anything more can be done.

## It says I already voted

`User has already voted` means the system already holds a ballot for the identity it checked — which, depending on the election's [security settings](security_options.md), is your voter ID, your account email, your device, or your network.

- **You did vote, and want to change your ballot.** That's only possible if the organiser enabled ballot updates. If they did, the election page shows an **Update Vote** button while voting is open, and your receipt email contains an update link. If they didn't, your ballot receipt states: *"This election does not support ballot updates. All ballots are final once submitted"*.
- **Someone else voted on this device.** In elections secured as *one vote per device*, the browser remembers that a vote was cast. Vote from your own device or browser instead.
- **You share a network.** In elections secured as *one vote per network*, only one ballot is accepted per internet connection. Ask the organiser how they'd like to handle shared households or offices.
- **You never voted.** If none of the above applies, your unique voting link may have been used by someone else — invitation emails warn: *"This link is unique to you, be careful not to share this email with others"*. Contact the organiser immediately; they can see when the ballot on your record was cast.

## Voter ID problems

Elections restricted to a voter list ask you to authenticate before voting. What that looks like depends on how the organiser set it up:

- **You got a unique voting link by email.** The link signs you in automatically — the election page will show *"Your unique voter id"* partly masked. Nothing to type.
- **You got a voter ID directly from the organiser.** Enter it in the **Voter ID** field on the election page. It's hidden as you type, like a password.

If you see `Invalid Voter ID`:

1. Re-enter the ID exactly as it was given to you. Watch for the classic copy-paste traps: a space picked up at either end, a letter O for a zero, a lowercase l for a one.
2. If you're pasting from an email, make sure you copied the whole ID and nothing more.
3. Still rejected? The ID isn't on this election's voter list. Only the organiser can see the list and correct it — contact them.

{: .note }
> The voter ID box only appears once the election is open. Before the start time, there is nothing to enter — that's not an error.

If instead you see `You must log in to access this election`, this election verifies voters by email account: use the log in link in that message. And if after logging in you see `You are not authorized to vote in this election`, the account you signed in with isn't on the voter list — ask the organiser which email address they registered for you.

## I never received my invitation email

For elections that use an email list, invitations are sent once the election starts — not when you're added to the list. If voting is open and you have nothing:

1. **Search your mailbox** for the election's name. The standard subject is *"Invitation to Vote In"* followed by the election title (organisers can customise it).
2. **Check your spam or junk folder.** Automated invitations are frequently filtered.
3. **Confirm your address with the organiser.** If they entered your email with a typo, the invitation went elsewhere, and only they can correct the list.
4. **Ask the organiser to retrieve your voting link.** The organiser can obtain your unique voting link and share it with you directly — by another email account, by message, or in person. That retrieval is recorded in the election's audit log, so it stays transparent. This is the standard fix, not a workaround; see [Security Options](security_options.md).

Your unique voting link does not expire. It works whenever the election is open, and stops accepting ballots when the election closes — the link itself is never the thing that "runs out".

## The Test Mode warning

If you see a banner titled **Test Mode** saying *"This election is still being drafted. All ballots will be counted as test votes and shall be reset prior to the final election"*, the organiser hasn't finalized the election yet.

You can fill out and submit a ballot — that's the point, it lets everyone check that the ballot works — but:

{: .warning }
> **Test votes are deleted when the organiser finalizes the election.** Your test ballot will not count in the real election, and you will need to vote again once it opens. Emails sent from an election in this state are marked as test messages for the same reason.

If you believe the election should already be live, tell the organiser — finalizing is a step only they can take.

## Did my vote count?

After a successful submission you land on a page headed *"Ballot Submitted"* — *"Thank you for voting!"*. If you saw that page, your ballot was recorded. If you return to the election page later, it will say *"Ballot Submitted"* instead of offering a Vote button.

Beyond that, there are two positive confirmations:

- **The receipt email.** In the submit dialog you can have a receipt sent (*"Send Ballot Receipt Email?"*). If your email is already known — from your voting link or your account — the dialog shows where the receipt will go; otherwise you can type an address into the optional field. The receipt's subject is *"Ballot Receipt For"* followed by the election title. **If no email address is provided, no receipt is sent** — there is no way to generate one later, so enter an address if you want proof.
- **The verification page.** The receipt email links to a page where you can view your ballot and its status at any time. It shows your ballot ID, each choice as recorded, and the status **Submitted**. Your ballot ID appears only in this receipt — it is deliberately not shown in your browser after voting, which protects voters from being pressured to prove how they voted.

If the election publishes live tallies, you may also be able to watch the count as it happens — see [Preliminary Results](preliminary_results.md). Whether results are visible, and when, is the organiser's choice.

{: .note }
> Left a race completely blank, or gave every candidate the same score in a STAR race? The confirmation dialog lists it as *"Abstained - No preference was expressed"*. That's an accurate record of a valid ballot, not an error.

## Warnings while filling out your ballot

Some messages appear before you submit. These are checks, not rejections — your ballot is still yours to fix:

- *"Do not skip rankings."* — on ranked ballots, skipping a rank doesn't help or hurt any candidate, but ranking in order states your preferences most clearly. Candidates you leave blank are ranked last.
- *"Do not rank multiple candidates equally. (Ranking candidates equally can void your ballot.)"* — ranked methods need a strict order; give each candidate their own rank.
- **The stars or bubbles won't respond.** If the ballot asks you to confirm *"I have read the instructions"*, you must tick that box before you can mark the ballot.
- **The Submit button stays greyed out** after you press it and the page says *"Submitting..."* — give it a moment; pressing again isn't needed. If it fails, the error appears at that point and nothing was recorded.

## Still stuck?

Contact your election organiser first — for anything about your election's voter list, timing, or settings, they are the only ones who can act. Include the short code from your error message if you got one. For general questions about how BetterVoting works, see the [FAQ](faq.md).
