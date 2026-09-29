---
layout: default
title: Verifying a Tie-Break
nav_order: 19
parent: BetterVoting Documentation
---

# Verifying a Tie-Break

If a tie decided your election, you don't have to take the result on trust. This page explains exactly what BetterVoting publishes about a tie-break and how to check it.

It's written for the person who lost a tie, and for anyone who has to certify a result to people who weren't in the room. For what a tie is and how one gets broken, start with [Ties](ties.md).

## What gets published

When a tie is broken by shuffle, BetterVoting doesn't just announce a winner. It publishes **the full tie-breaking order** — every candidate involved, from highest priority to lowest.

That order appears in two places:

* **On the results page**, in the tie-breaker section shown alongside the result.
* **In the downloadable election data**, where each candidate carries its position in the order, along with which candidates were tied and what kind of tie-break was applied.

This matters more than it sounds. A losing candidate can be shown the complete ordering rather than a single assertion about who won. There is nothing to reveal on request — it is already published.

## Why the result can be checked at all

The shuffle is **deterministic by design**. It is not a fresh coin toss performed once and recorded; it is a calculation that produces the same answer every time it runs, from inputs that are themselves published.

Three consequences worth stating plainly:

* **Re-running the count cannot change the answer.** If the same ballots are tabulated again, the same tie-breaking order comes out. An administrator cannot re-run the results hoping for a different outcome.
* **Nobody could know the order in advance.** One of the inputs is the number of ballots cast, so the ordering isn't fixed when the election is created — it settles only when voting ends.
* **It can be reproduced independently.** The shuffling algorithm was deliberately chosen to be small and language-agnostic, precisely so that someone outside the project can implement it and get the same result.

{: .warning }
> **The one number people get wrong.** The shuffle uses the **raw** ballot count — every ballot submitted, which is what appears in the full data download. The results page displays a **tally** count, which excludes ballots that couldn't be counted. These two numbers are frequently different, and a check done with the tally count will produce the wrong order and look like evidence of a problem. Use the raw count.

## How to check it

1. **Download the full election data.** You need the raw ballots, not the summary shown on screen.
2. **Note the published tie-breaking order** from the results page or the export — the whole ordering, not just the winner.
3. **Count the raw ballots** in the download. This is the figure that feeds the shuffle.
4. **Reproduce the shuffle** using that ballot count and the identifier of the race the tie occurred in, and compare the ordering you get against the published one.
5. **Confirm the tie-break was actually needed** — that the candidates recorded as tied really were level on the count, and that the earlier steps of the protocol (which use the ballots themselves) genuinely couldn't separate them.

Step 5 is the one people skip, and it's the one that matters most. A correct shuffle applied to a tie that shouldn't have existed is still a wrong result.

## What this does and does not prove

Being precise about the limits is what makes the check worth doing.

**It does prove** that the published tie-breaking order follows from the published inputs — that the ordering wasn't chosen, adjusted, or re-rolled to favour anyone. Given those ballots and that race, that ordering is the only one the rules produce.

**It does not prove that the ballot set is correct or complete.** Whether the right people voted, whether every ballot was received, and whether any were wrongly excluded are separate questions. Verifying a tie-break tells you the tie was broken according to the rules; it says nothing about what happened before the counting started. If your concern is the ballots rather than the tie-break, that's a different check.

**It does not make the outcome fair in a wider sense.** A tie-break is a rule for resolving a genuine deadlock. It produces a defensible answer, not a more deserving winner.

## If the numbers don't match

Contact the election administrator before drawing conclusions — a mismatch is far more often a raw-versus-tally mix-up than anything else.

When you get in touch, include: which race, the tie-breaking order you were shown, the ordering you calculated, and the raw ballot count you used. Those four things let someone find the discrepancy immediately. Without them the conversation takes days.

If the administrator can't resolve it, they can escalate to BetterVoting with the same information.

## Related

* [Ties](ties.md) — when ties happen and how they're broken
* [Hand Count](hand_count.md) — verifying a count without a computer
