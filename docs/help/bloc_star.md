---
layout: default
title: Bloc STAR Voting
nav_order: 9
parent: BetterVoting Documentation
---

{:toc}

# Bloc STAR Voting

**Bloc STAR Voting elects majority preferred winners for multi-winner elections.** It is ordinary STAR Voting repeated once per seat: elect a winner, take that winner out of the running, then run the same count again on the same ballots until every seat is filled.

On BetterVoting you get Bloc STAR by choosing the **STAR** ballot and then **Basic Multi-Winner** with more than one winner. Note that "Multi-Winner STAR Voting" with no other qualifier means Bloc STAR — see sections 1.c and 1.e of the [STAR Voting technical specifications](https://www.starvoting.org/technical_specifications). The other multi-winner option, **Proportional Multi-Winner**, is a different method with a different goal; [choosing between them](#is-bloc-star-right-for-your-election) is the most important decision on this page.

This page is for admins deciding whether Bloc STAR fits their election, and for voters who want to know how their ballot is counted.

## The ballot doesn't change

Nothing about the ballot changes when a race fills several seats. It is the same 0–5 stars, with no "pick three for three seats" limit and nothing to ration: scoring one candidate never costs another candidate anything. Whether the race fills one seat or five, voters learn one ballot.

Ballot text for a Bloc STAR race (also listed in [Paper Ballots](paper_ballots.html)):

> **Bloc STAR Voting: Score - Then - Automatic - Runoffs**
>
> Bloc STAR Voting elects majority preferred winners for multi-winner elections.
>
> * This election will elect X winners. Give your favorite five stars. Give your last choice zero or leave blank. Equal scores are allowed. Score other candidates as desired.
> * The two highest scoring candidates are finalists. Your full vote goes to the finalist you prefer. The candidate with the most votes is elected. This process repeats with remaining candidates until all seats are filled.

## How the count works

For each seat, in order:

1. **Scoring round.** Add up every candidate's stars. The two highest scorers advance as finalists.
2. **Automatic runoff.** Every ballot goes to whichever finalist it scored higher, and the finalist preferred by more voters is elected. A ballot that scored both finalists equally — including a ballot that left both blank — shows as *no preference* and is not counted for either.
3. **Remove the winner** from the field and go back to step 1 with the same, unchanged ballots.

Repeat until all seats are filled. The winners are listed in the order the seats were filled.

Removing an elected candidate only takes them out of the running. It does not spend, reweight, or discount anybody's ballot, and it does not change any other candidate's score — a candidate who scores 12 in the first scoring round still scores 12 in the next one. That is exactly what **Proportional Multi-Winner** does differently, and it is why Bloc STAR is *majoritarian* rather than *proportional*.

## A worked example

Three candidates, two seats, three ballots:

| Ballot | A | B | C |
|---|---|---|---|
| 1 | 5 | 0 | 0 |
| 2 | 4 | 1 | 0 |
| 3 | 3 | 0 | 2 |
| **Score** | **12** | **1** | **2** |

**Seat 1 — scoring round.** A (12) and C (2) are the two highest scorers, so they are the finalists. B (1) is out for this seat.

**Seat 1 — automatic runoff.** Every ballot scored A above C, so the runoff is A 3, C 0, no preference 0. **A is elected to seat 1.**

**Seat 2 — scoring round.** A is removed. Nothing else changes: C still has 2, B still has 1, and with only two candidates left both advance.

**Seat 2 — automatic runoff.** Ballot 1 scored B and C equally (both 0), so it registers no preference. Ballot 2 prefers B (1 to 0). Ballot 3 prefers C (2 to 0). The runoff is B 1, C 1, no preference 1 — a tie.

**Seat 2 — tiebreaker.** Runoff ties are broken in favor of the candidate who was scored higher, and C (2) outscores B (1). **C is elected to seat 2.** The full ladder is on the [Ties](ties.html) page.

**Winners: A, then C.**

Three things this small election is worth reading twice for:

* **Removing a winner changes nothing but the field.** B and C score 1 and 2 in the first scoring round and 1 and 2 again in the second. The second seat is the first count with one column deleted.
* **"Majority preferred" means preferred out of who is left, by the voters who expressed a preference.** A was scored above C by all three voters. C won seat 2 while being preferred by one voter out of three — one of the two who expressed a preference between B and C at all. Later seats are contested by weaker candidates, so the support behind the last seat is normally well below the support behind the first, and a runoff percentage is a share of the voters who expressed a preference between *those two finalists*, not a share of everyone who voted.
* **Small elections really do tie.** Settle your tiebreaker protocol before the election rather than after — see [Ties](ties.html).

## Running a Bloc STAR election on BetterVoting

1. Create your election and open the race.
2. Set **Which Voting Method?** to **STAR**.
3. Choose **Basic Multi-Winner** and set **How many winners?** to the number of seats.

Everything else — candidates, voter authentication, [security options](security_options.html) — works exactly as it does in a single-winner race. Results show the scoring round and the automatic runoff for each seat.

## Is Bloc STAR right for your election?

Bloc STAR asks "who does the majority most want?" once for every seat. That is the right question for some bodies and the wrong question for others.

**Bloc STAR is a good fit when:**

* You want the *best few* candidates rather than a body that mirrors the electorate — a shortlist, a slate of finalists, a primary that advances a top set.
* You want every winner to have demonstrated majority support head-to-head.
* Accountability matters: a majority opposed to a candidate can keep that candidate out, or vote them out later.
* You want to give voters more candidates to choose from without vote splitting punishing a side for running two.

**Bloc STAR is the wrong tool when the body is meant to represent a diverse electorate.** It is not proportional and cannot be made proportional. A cohesive majority can win *every* seat: 55% of voters can hold a five-seat board 5–0 while the other 45% hold nothing. Nothing in the count ever notices that a group has already been served. If a large minority ending up with zero seats would read as a broken election, use **Proportional Multi-Winner** instead ([Proportional STAR](https://equal.vote/pr)), which is designed so that roughly 1/N of the voters can elect roughly 1 of N seats.

> **Do not use Bloc STAR — or any at-large bloc method — where geographic or minority representation is at stake.** At-large bloc voting lets a jurisdiction-wide majority take every seat, and it has repeatedly been challenged and struck down under Section 2 of the federal Voting Rights Act where it diluted the voting strength of a minority community that would have won representation in single-member districts. This is a property of *at-large bloc counting*, and switching the ballot to stars does not repair it. Equal Vote's guidance is the same: Bloc STAR should never be used in jurisdictions with localized historically marginalized communities. See [Multi-Winner STAR Voting](https://www.starvoting.org/multi_winner).

Used in the right place, Bloc STAR sits between single-winner and proportional elections, and it is a reasonable stepping stone for a group working toward proportional representation later.

## How to vote in a Bloc STAR election

The advice is the same as in single-winner STAR: **be honest.** Give your favorites five stars, give the candidates you least want zero or leave them blank, and use the scores in between to show both your order of preference and how strongly you support each candidate. Equal scores are allowed.

One tactic that specifically backfires in a multi-winner race is padding your top score. If a race elects nine winners, giving five stars to nine candidates does not give you nine votes — it gives up your say in *which* of those nine wins, and in what order the seats are filled. If you would genuinely be happy with any of them, that is an honest ballot. If you have favorites among them, score your favorites highest and give the rest the number of stars you actually think they deserve.

Strategic voting is not eliminated by any voting method, but in STAR it is neither reliable nor rewarding, and voters who simply score honestly generally get the best result they can. For a longer version of this answer, see the [Multnomah County Democrats' STAR Voting FAQ](https://medium.com/countydemocratreader/faq-for-the-2021-multdems-star-voting-reorg-election-e0a811f66b29).

## More reading

* [Multi-Winner STAR Voting](https://www.starvoting.org/multi_winner) — when to use bloc and when to use proportional
* [STAR Voting technical specifications](https://www.starvoting.org/technical_specifications) — Bloc STAR is defined in 1.c, 1.e, and 2.c
* [Bloc STAR Voting on electowiki](https://electowiki.org/wiki/Bloc_STAR_Voting)
* [Proportional STAR Voting](https://equal.vote/pr) — the proportional alternative
* [Ties](ties.html) — the tiebreaker protocol used above
* [Paper Ballots](paper_ballots.html) — ballot text and hand-count guidance
