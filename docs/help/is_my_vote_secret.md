---
layout: default
title: Is My Vote Secret?
nav_order: 8
parent: BetterVoting Documentation
---

# Is My Vote Secret?

**The short version: nobody — including the person running your election — can see how *you* voted. In an election with a voter list, they can see *that* you voted.** Those two things are separated deliberately, and this page explains how.

## What the organiser can see

**They can see who has voted.** In an election with a voter list, each voter is marked as having voted or not. This allows the admin to send reminder to those who haven't voted yet.

**They can see anonymized ballots.** Once an election has closed (or if the organiser turned on public results), they can look at the ballots that were cast.

**They cannot connect the two.** When ballots are handed out for viewing any personal identifiable information is stripped and what's left is the votes themselves. Nothing says who cast the votes.

What's left is the votes themselves, and nothing that says whose they are.

## Why the order is shuffled

Removing names isn't enough on its own, and BetterVoting doesn't stop there.

If ballots came back in the order they were cast, a bad actor could try to infer the voter identity from that order.

So **ballots are deliberately returned in a random order**, and the same protection applies to the anonymised ballot data that gets published with public results, which carries only a ballot ID, the election, the precinct, and the votes.

## What this does and doesn't protect against

Being straight about the limits is part of the answer.

**It does protect against** a bad actor looking up how a particular person voted. The identifying fields aren't hidden from them; they aren't sent at all.

**It doesn't make you anonymous to yourself.** If you got an email receipt, that link shows you your own ballot. Anyone who gets into your email could see it too, so treat the receipt like any other private message.

**It doesn't cover a very small electorate.** If a race has three voters and the result is 3–0, everyone knows how everyone voted. That's arithmetic, not a software failure, and no system can prevent it.

{: .note }
> If ballot secrecy is critical for your situation — a union vote, a contested board election, anything where the answer matters — ask your organiser what they configured before you vote. They choose the settings, and they're the only ones who can tell you what applies to your specific election.

## Related

* [Security Options](security_options.md) — the voter list and authentication choices your organiser picked from
* [Preliminary Results](preliminary_results.md) — what can be seen while voting is still open
