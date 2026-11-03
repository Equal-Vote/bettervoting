---
layout: default
title: Ties
nav_order: 3
parent: Counting and Results
grand_parent: Running an Election
---

{:toc}

# Ties

Ties can happen with any voting method, especially in small polls and demos with only a few voters. This page describes, in plain language, how BetterVoting breaks ties for each voting method it offers.

For elections run on BetterVoting, our [source code](https://github.com/Equal-Vote/bettervoting/tree/main/packages/backend/src/Tabulators/) is the final authority on exactly how ties are broken. The descriptions below cover the common cases. When a race is decided by a random tie-breaker, its results page says so, and STAR Voting results also walk through the count step by step, including any tie-breaker.

## Establish tie-breaking protocols in advance

The body hosting the election is responsible for establishing tie-breaking protocols in advance of its elections.

If an election has already been conducted and no protocol was specified, we recommend the protocols below. They are the ones BetterVoting uses, and they're designed to break ties effectively while staying simple and transparent.

## STAR Voting

Tie votes in STAR Voting are rare - well over 10 times less common than with choose-one voting. BetterVoting uses the Official Tie-breaker Protocol for STAR Voting.

**Ties during the Scoring Round**
* *Step 1*: If only two candidates are tied, the tie should be broken in favor of the candidate who was preferred (scored higher) by more voters, if possible.
* *Step 2*: If more than 2 candidates are tied, or if an equal number of voters supported both tied candidates, then break the tie in favor of the tied candidate who received the most five-star ratings.
* *Step 3*: Otherwise, break the tie randomly.

**Ties during the Automatic Runoff Round**
* *Step 1*: Ties in the Runoff Round should be broken in favor of the candidate who was scored higher if possible.
* *Step 2*: If both runoff candidates have the same score, break the tie in favor of the tied candidate who received the most five-star ratings.
* *Step 3*: Otherwise, break the tie randomly.

## Proportional STAR

In each round, the candidate with the highest weighted score is elected. If two or more candidates tie for the highest weighted score, the tie is broken randomly.

## Ranked Robin

Ranked Robin elects the candidate who wins the most head-to-head matchups. A candidate wins a matchup against another candidate if more voters ranked them higher. If both candidates are ranked higher by the same number of voters, the matchup is a tie, and each candidate gets half a win.

When two or more candidates have the most wins:
* *Step 1*: If exactly two candidates are tied, break the tie in favor of the candidate who won their head-to-head matchup.
* *Step 2*: If more than two candidates are tied, or the two tied candidates also tied their head-to-head matchup, break the tie randomly.

When electing more than one winner, BetterVoting fills one seat at a time. It elects the remaining candidate with the most wins, using the steps above to break any tie, and repeats until every seat is filled. Each candidate's wins are counted once, across all candidates, before the first seat is filled.

## Ranked Choice Voting and Single Transferable Vote

When candidates are tied in a round, whether for last place (to decide who is eliminated) or for first place (to decide who is elected):
* *Step 1*: Break the tie in favor of the candidate who had more votes in the previous round. If they were tied there too, look at the round before that, and so on back to the first round.
* *Step 2*: If they were tied in every round, break the tie randomly.

## Approval and Choose One

The candidate with the most approvals (or, for Choose One, the most votes) wins. If two or more candidates are tied for the most, the tie is broken randomly. When electing more than one winner, seats are filled one at a time the same way.

## Random Tie-breakers

In the event a random tiebreaker is needed, BetterVoting will shuffle the candidates to determine the tie breaking order. The specific shuffling implementation was carefully chosen to maximize security, transparency, and fairness. The full details are documented in [our source code](https://github.com/Equal-Vote/bettervoting/tree/main/packages/backend/src/Tabulators/).

## Custom Tie-breakers

Tiebreakers can also be determined outside of BetterVoting using protocols established by the body. Common random approaches include doing a coin toss or drawing a name out of a hat. The full list of anonymized ballots can also be utilized if it's required for the preferred tiebreaker method.

## Questions and more examples

* STAR Voting results pages explain every step of the count, including which tie-breaker decided the result.
* The automated tests next to each tabulator in the [source code](https://github.com/Equal-Vote/bettervoting/tree/main/packages/backend/src/Tabulators/) include small worked examples of ties for STAR Voting, Proportional STAR, Ranked Robin, Approval and Choose One.
* For anything else, reach out to our team at elections@equal.vote.
