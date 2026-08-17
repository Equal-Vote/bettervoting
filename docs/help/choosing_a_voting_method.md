---
layout: default
title: Choosing a Voting Method
nav_order: 3
parent: BetterVoting Documentation
---

# Choosing a Voting Method

BetterVoting offers seven methods, and the builder doesn't tell you which to pick. This page does.

**If you want the short version:** for a single winner, **STAR Voting** is a good default — it asks voters an easy question and doesn't punish them for answering honestly. For several winners, decide first whether you want *the strongest winners* or *a representative mix*, because that choice matters more than the method.

Everything below is about matching the method to your situation.

## Two questions, in order

### 1. How many winners?

**One winner** — any of the seven work. Skip to the next question.

**More than one** — BetterVoting asks you a second question, and it's the most consequential one on this page:

| | What it does | Choose it when |
|:---|:---|:---|
| **Basic Multi-Winner** | Elects the first winner as in a single-winner race, then repeats until the seats are full | You want the strongest winners — the ones with the broadest support |
| **Proportional Multi-Winner** | Uses a quota so that any faction with enough supporters wins a seat | You want the result to reflect the make-up of your electorate |

The difference is not subtle. With **Basic**, a group that is 60% of your voters can win *every* seat. With **Proportional**, a group that is 30% of your voters gets roughly 30% of the seats.

Neither is wrong — they answer different questions. A hiring committee picking three finalists usually wants Basic. A board meant to represent a membership usually wants Proportional. If you're filling seats that are supposed to *represent* people, and you pick Basic, you may be surprised by the result.

### 2. What do you want to ask your voters?

Every method is really a question put to the voter. Pick the question that fits your race.

| Method | What the voter does | Good when |
|:---|:---|:---|
| **STAR Voting** | Scores each candidate 0–5 | You want both *who* they prefer and *how much* — a solid default |
| **Approval Voting** | Ticks everyone they'd be happy with | You want the simplest possible ballot, or you need to count by hand |
| **Ranked Robin** | Ranks the candidates | You want the candidate who beats every other one head-to-head — the consensus pick |
| **Ranked Choice Voting** | Ranks the candidates | Your voters already know RCV, or your organisation's rules require it |
| **Choose One** | Picks exactly one | Familiarity matters more than anything else, or your bylaws require it |
| **Proportional STAR** | Scores each candidate 0–5 | Multi-winner, and you want proportional representation with a scored ballot |
| **Single Transferable Vote** | Ranks the candidates | Multi-winner, proportional, and your voters or rules expect ranked ballots |

**Ranked Choice Voting** here means ranked ballots counted by *instant runoff* — the lowest-ranked candidate is eliminated each round and their votes transfer, until someone has a majority. Ranked Robin uses the **same ballot** but counts it differently, by comparing every pair of candidates head-to-head. If your voters like ranking, you have two options, not one.

## What each is good at, and where it strains

No method is best at everything — that's a mathematical result, not modesty. Here's the honest version.

**STAR Voting.** Voters can support a favourite *and* a compromise without the two working against each other, so there's little reason to vote strategically. The 0–5 ballot carries more information than a rank or a tick. Against it: it's the least familiar of the seven, and some voters find scoring harder than ranking or picking.

**Approval Voting.** By far the easiest to explain, and the easiest to count — including [by hand](hand_count.md). Against it: voters can't say that they love one candidate and merely tolerate another. Everything above your line counts the same, and deciding where to draw that line is its own small dilemma.

**Ranked Robin.** Elects the candidate who would beat each of the others one-on-one, which is a strong claim to make about a winner. Same ballot as RCV, so nothing new is asked of voters who already rank. Against it: occasionally no such candidate exists — A beats B, B beats C, C beats A — and the result then depends on a tiebreaking rule rather than an obvious winner.

**Ranked Choice Voting.** The most widely used alternative method in the US, so it needs the least explaining to voters who've met it. Against it: a broadly-liked candidate who is few voters' *first* choice can be eliminated early, and ballots that rank only a few candidates can stop counting before the final round.

**Choose One.** Everyone already knows it, and for a two-candidate race it's perfectly good. Against it: with three or more similar candidates, votes split between them and a candidate most voters don't want can win. That vote-splitting problem is the reason the other six exist.

**Proportional STAR** and **STV** are the multi-winner options above; both are harder to explain to voters than their single-winner counterparts, which is the price of proportionality.

## Still not sure?

**Two candidates?** Any method gives the same answer. Pick Choose One and move on.

**A quick, low-stakes poll?** Approval. Least friction, easiest to explain in one line.

**A real decision with three or more options?** STAR Voting.

**Your group already uses ranked ballots?** Ranked Robin or RCV — and if you have a free choice, Ranked Robin gets you the consensus candidate from the same ballot your voters are used to.

**Filling seats meant to represent a membership?** Proportional Multi-Winner, then STAR PR or STV depending on which ballot you prefer.

{: .note }
> BetterVoting is built by the Equal Vote Coalition, which advocates for STAR Voting. That's why STAR is the default suggestion here. All seven methods are fully supported and counted correctly — pick the one that fits your situation, not the one we like best.

## Try them side by side

You don't have to take anyone's word for it. **Duplicate your race and give the copy a different method.** Your voters fill in both, and you can compare the experience and the winners on real ballots from your own group.

It's the fastest way to see what a method actually does with *your* electorate, and it costs one extra race.

## Related

* [Ties](ties.md) — what happens when a method can't separate two candidates
* [Hand Count](hand_count.md) — counting without a computer, and which methods suit it
* [Paper Ballots](paper_ballots.md) — printing ballots for in-person voting
* [Preliminary Results](preliminary_results.md) — what voters can see while voting is still open
