---
layout: default
title: Is My Vote Secret?
nav_order: 8
parent: BetterVoting Documentation
---

# Is My Vote Secret?

It's the question voters ask most, and it deserves a straight answer rather than a reassuring one.

**The short version: nobody — including the person running your election — can see how *you* voted. In an election with a voter list, they can see *that* you voted.** Those two things are separated deliberately, and this page explains how.

## What the organiser can see

**They can see who has voted.** In an election with a voter list, each voter is marked as having voted or not. This isn't incidental — it's what makes reminders work, so that only people who haven't voted get chased.

**They can see the ballots.** Once an election has closed (or if the organiser turned on public results), they can look at the ballots that were cast.

**They cannot connect the two.** When ballots are handed out for viewing, the following are stripped from every one of them:

* the voter's user ID
* the hash of the voter's IP address
* the time the ballot was submitted
* the ballot's creation and update times
* the ballot's edit history

What's left is the votes themselves, and nothing that says whose they are.

## Why the order is shuffled

Removing names isn't enough on its own, and BetterVoting doesn't stop there.

If ballots came back in the order they were cast, an organiser could line that order up against the voter list — which records when each person voted — and work out who cast which ballot. Names would be gone, but anonymity wouldn't be.

So **ballots are deliberately returned in a random order**. The shuffle uses a cryptographic random number generator, not an ordinary one, specifically so the sequence can't be predicted or reconstructed. The same protection applies to the anonymised ballot data that gets published with public results, which carries only a ballot ID, the election, the precinct, and the votes.

## Who can look at ballots at all

Not everyone with access to an election can.

| Role | Can view ballots? |
|:---|:---|
| Owner, Admin, Auditor | Yes — after the election closes, or if public results are on |
| Credentialer | No |
| Everyone else | Only if the organiser turned on public results |

And there's a timing rule on top: **while an election is still open, ballots are not available to anyone** unless the organiser has deliberately made results public. An organiser cannot quietly watch votes arrive during a live election.

## What this does and doesn't protect against

Being straight about the limits is part of the answer.

**It does protect against** the organiser — or an admin or auditor — looking up how a particular person voted. The identifying fields aren't hidden from them; they aren't sent at all.

**It doesn't make you anonymous to yourself.** If you got an email receipt, that link shows you your own ballot. Anyone who gets into your email could see it too, so treat the receipt like any other private message.

**It doesn't cover a very small electorate.** If a race has three voters and the result is 3–0, everyone knows how everyone voted. That's arithmetic, not a software failure, and no system can prevent it.

**It doesn't change what your organiser knows outside the system.** If they asked you in person how you were going to vote, BetterVoting can't help with that.

{: .note }
> If ballot secrecy is critical for your situation — a union vote, a contested board election, anything where the answer matters — ask your organiser what they configured before you vote. They choose the settings, and they're the only ones who can tell you what applies to your specific election.

## Related

* [Security Options](security_options.md) — the voter list and authentication choices your organiser picked from
* [Preliminary Results](preliminary_results.md) — what can be seen while voting is still open
