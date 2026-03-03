---
layout: default
title: Ties
nav_order: 6
parent: BetterVoting Documentation
---

{:toc}

# STAR Voting Ties

Tie votes in STAR Voting are rare - well over 10 times less common than with choose-one voting - but as with any voting method, they can occur, especially in small demos or elections without many voters.

## Establish tie-breaking protocols in advance

The body hosting the election is responsible for establishing tie-breaking protocols in advance of its elections.

In the event that an election has already been conducted but no protocol was specified, we recommend the Official Tiebreaker Protocol below. This is also the protocol used on BetterVoting, and it’s designed to effectively break ties while also maintaining simplicity and transparency.

## Official Tie-breaker Protocol

**Ties during the Scoring Round**
* *Step 1*: If only two candidates are tied, the tie should be broken in favor of the candidate who was preferred (scored higher) by more voters, if possible. 
* *Step 2*: If more than 2 candidates are tied, or if an equal number of voters supported both tied candidates, then break the tie in favor of the tied candidate who received the most five-star ratings.
* *Step 3*: Otherwise, break the tie randomly.

**Ties during the Automatic Runoff Round**
* *Step 1*: Ties in the Runoff Round should be broken in favor of the candidate who was scored higher if possible.
* *Step 2*: If both runoff candidates have the same score, break the tie in favor of the tied candidate who received the most five-star ratings.
* *Step 3*: Otherwise, break the tie randomly.

## Random Tie-breakers

In the event a random tiebreaker is needed, BetterVoting will shuffle the tied candidates using the number of voters as a seed. The implementation is available [open source](https://github.com/Equal-Vote/bettervoting/blob/f95431ddbaa4a41f21a77a5c16b06f1e19d8cb6c/packages/backend/src/Tabulators/Util.ts#L138) for those interested.

Other common random tiebreaker approaches include doing a coin toss or drawing a name out of a hat.

## Custom Tie-breakers

If an election body opts for a different tiebreaker, they can retrieve the full list of anonymized ballots from the results page for their election. The winners can then be determined outside of BetterVoting using protocols established by the body. 