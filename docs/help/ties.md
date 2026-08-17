---
layout: default
title: Ties
nav_order: 6
parent: BetterVoting Documentation
---

# Ties

A tie happens when two candidates finish exactly level and something has to separate them. This page explains when that happens, how BetterVoting breaks a tie, and how to check what it did.

**If you are testing a small election and everything keeps tying, that's expected** — skip to [Ties in small and test elections](#ties-in-small-and-test-elections).

## How often ties actually happen

In a real election with a reasonable number of voters, ties are rare. STAR Voting in particular ties far less often than choose-one voting, because a 0–5 score carries more information than a single mark, so there are many more ways for candidates to differ.

But **ties are common in exactly the situation where most people first meet them**: a handful of ballots, a few candidates, and a test run. With five voters and three candidates there simply aren't many possible totals, so exact matches happen constantly. That isn't a fault in the election or the software — it's arithmetic.

## Decide your tie-breaking rule in advance

**The organisation running the election is responsible for setting a tie-breaking rule before the election, not after.** This matters more than the rule you choose. Any rule agreed in advance is defensible; the best rule in the world, chosen after the votes are in, looks like it was chosen to produce a particular winner.

If an election has already been run and no rule was agreed, we recommend the protocol below — it is also the one BetterVoting applies automatically.

## The tie-breaking protocol

**Ties in the Scoring Round**

* *Step 1*: If exactly two candidates are tied, the tie goes to the candidate preferred (scored higher) by more voters, where that can be determined.
* *Step 2*: If more than two candidates are tied, or an equal number of voters preferred each, the tie goes to the tied candidate with the most five-star scores.
* *Step 3*: Otherwise the tie is broken by the shuffle described below.

**Ties in the Automatic Runoff**

* *Step 1*: The tie goes to whichever finalist scored higher, where that can be determined.
* *Step 2*: If both finalists have the same score, it goes to whichever received more five-star scores.
* *Step 3*: Otherwise the tie is broken by the shuffle described below.

**Other voting methods.** Every method BetterVoting offers can produce a tie, and each resolves it using the information that method collected — head-to-head results for Ranked Robin, approval counts for Approval Voting, and so on. When a method's own information can't separate the candidates, all of them fall through to the same shuffle.

**Multi-winner elections** can tie on the last seat, which is the most common place to see one. The same steps apply.

## Random Tie-breakers

When nothing in the ballots can separate two candidates, BetterVoting shuffles the candidates to decide the order, and the higher-placed one wins the tie.

**The shuffle is deliberately reproducible.** It is not a fresh coin toss each time the results are calculated — re-running the count always produces the same order. That's a deliberate design decision, and it's what makes the outcome checkable rather than something you have to take on trust.

Two things go into it:

* **The number of ballots cast.** This means the order is not fixed in advance — it changes as votes come in, so nobody can know the tie-breaking order before voting ends.
* **A value derived from the race itself.** Without this, a poll that asks the same question twice with different methods would break its ties identically in both races. This keeps them independent.

The shuffling uses a small, deliberately language-agnostic algorithm, chosen so the result can be reproduced in any programming language by anyone who wants to check it.

**How to check what happened.** When a tie is broken this way, the results page shows the full tie-breaking order — every candidate, highest priority to lowest, not just the winner. That same order is included in the downloadable election data. So a candidate who lost a tie can be shown the complete order rather than asked to accept an assurance.

{: .note }
> One number to be careful with. The shuffle uses the **raw** ballot count — every ballot submitted, which is what you get when you download the full data. The results page shows a **tally** count, which excludes ballots that couldn't be counted. The two are often different, and the raw figure is the one that matters here.

## Ties in small and test elections

If you're trying BetterVoting out with a few ballots and hitting ties constantly, nothing is wrong. Three points that answer most questions:

**Ties are normal at this scale.** With few voters and few candidates there are only so many possible totals. Add more ballots and ties become rare quickly.

**The tie-breaking order changes every time a ballot is cast.** Because the ballot count feeds the shuffle, the order you see after three test ballots is not the order you'll see after four. If you're testing and the tie-break keeps landing differently, that is the system working as designed, not a bug.

**Your test results tell you nothing about the real election's tie-breaks.** Test ballots are deleted when you finalize, so the real election starts from zero ballots and produces its own order. Don't plan around a tie-break you saw while testing.

{: .warning }
> **A deliberately tied test election is not a good test of your setup.** Ties exercise the tie-breaking path rather than the count, so a tied test tells you little about whether your election is configured correctly. If you want to check that your ballot, voter list and results look right, use test ballots that produce a clear winner.

## Breaking a tie yourself

You don't have to use BetterVoting's protocol. Your organisation can apply its own rule — a coin toss, drawing a name, seniority, an existing bylaw — as long as it was agreed in advance.

If your rule needs the ballots, the full set of anonymised ballots can be downloaded and used however your protocol requires.

## Related

* [Preliminary Results](preliminary_results.md) — why early results move around, and why a tie mid-election often isn't one at the end
* [Hand Count](hand_count.md) — counting without a computer, including breaking ties by hand
