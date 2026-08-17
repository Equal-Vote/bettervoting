---
layout: default
title: Choosing a Tie-Breaking Rule
nav_order: 20
parent: BetterVoting Documentation
---

{:toc}

# Choosing a Tie-Breaking Rule for Your Organization

Ties are rare — under STAR Voting, far rarer than under choose-one voting — but every organization that runs elections should assume one will eventually happen, usually in a small election where a handful of votes decide everything.

This page is for boards, committees, and organizations writing or amending their rules **before** an election. If a tie has already happened and you have no rule, see [Ties](ties.md) for the protocol we recommend and use by default.

## Decide in advance — this is the whole point

Any reasonable rule agreed **before** the votes are cast is defensible. The best rule in the world, chosen **after** the votes are in, looks like it was chosen to pick a winner — because everyone can see whom each option would favor. A tie-breaking rule doesn't need to be perfect; it needs to be written down before anyone knows who benefits from it.

{: .important }
> If your organization takes one thing from this page: put a tie-breaking rule in writing before the election, whatever the rule is.

## What happens if you choose nothing

If your election runs on BetterVoting and your rules are silent, results follow BetterVoting's [Official Tie-breaker Protocol](ties.md): ties are first broken by the ballots themselves (head-to-head preference, then number of five-star scores), and only if those fail does a random tie-breaker apply. BetterVoting's "random" step is a published, deterministic shuffle — re-running the tabulation always reproduces the same order, and the details are documented in the [source code](https://github.com/Equal-Vote/bettervoting/tree/main/packages/backend/src/Tabulators/).

That is a reasonable default, and many organizations simply adopt it explicitly. But it is a *default*, not the only sensible choice — and adopting it on purpose is much stronger than falling into it by silence.

## The realistic options

### 1. Adopt BetterVoting's built-in protocol

**How it works:** Your rule says results, including any ties, are determined by the platform's published protocol.

**Fits when:** You want the count to be fully automatic, reproducible, and finished on election night, with no meeting needed to resolve a tie.

**How it goes wrong:** The final random step, though deterministic and published, is not something members can watch happen in a room. If your membership would only trust a tie-break they can physically witness, a software shuffle — however fair — may not satisfy them. Adopt it only if your organization is comfortable with that.

### 2. Casting vote of the chair

**How it works:** When a vote is tied, the chair (or another named officer) has an additional, deciding vote.

**Fits when:** Decisions must not stall, and the chair is seen as impartial. Common in corporate boards and committees.

**How it goes wrong:** Two ways. First, it converts the tie into a personal decision — the chair publicly picks the winner, which can be politically costly in a contested election of *people* (as opposed to a vote on a motion). Second, the mechanics conflict with secret-ballot voting: under Robert's Rules of Order, the chair votes with everyone else in a ballot vote and cannot vote a second time to break the tie. If you want a casting vote, your rule must say explicitly that it overrides that, and whether the chair may use it in elections or only on motions. This option fits routine motions far better than it fits electing officers.

### 3. Repeat ballot

**How it works:** If candidates tie, vote again — sometimes after a fixed pause or discussion. This is Robert's Rules' own default for elections: keep balloting, with no candidates eliminated, until someone wins.

**Fits when:** Your voters are all in one room (or can easily vote again), and you'd rather resolve a tie by persuasion than by chance. A repeat ballot lets a genuine winner emerge as a few voters change their minds.

**How it goes wrong:** It can fail to terminate — a genuinely split electorate can tie again, and again. And it doesn't transfer to elections run over days by remote ballot, where "vote again" means running a whole second election with different turnout. If you choose this, cap it: for example, at most one repeat ballot, then a named fallback (such as a physical lot).

### 4. Drawing lots physically

**How it works:** A coin toss, drawing a name from a container, or a similar physical randomizer, performed in front of witnesses.

**Fits when:** You want a resolution everyone can see is fair, and that no one can be blamed for. This is the oldest and most widely used approach: roughly 35 U.S. states resolve at least some tied public elections by lot, and Virginia's practice dates to a 1705 statute. Between genuinely tied candidates, chance is not a failure of democracy — it is the honest answer.

**How it goes wrong:** Only through vagueness. "Decided by lot" with no procedure invites an argument about the procedure at the worst possible moment. See [What "random" must mean in a rule](#what-random-must-mean-in-a-rule) below.

### 5. Seniority or another objective attribute

**How it works:** The tie goes to the candidate with longer membership, longer board service, or some other attribute fixed before the election.

**Fits when:** The attribute is genuinely objective, recorded, and accepted by the membership as relevant — for example, an incumbent-continuity rule in a body that values experience.

**How it goes wrong:** It is a structural thumb on the scale — it systematically favors insiders over newcomers, every time. It can also turn out to be less objective than it looked ("membership since when, exactly? Did the lapsed year count?"). If the attribute can itself be tied or disputed, you have traded one tie for a worse one. If you use this, define the attribute precisely and add a final fallback.

### 6. Status quo prevails / the motion fails

**How it works:** A tie means no change: the motion fails, the incumbent stays, or the seat follows whatever the rules say happens when no one is elected.

**Fits when:** The vote is on a *proposal*. This is the near-universal default in parliamentary procedure — under Robert's Rules a tied motion simply fails, because it lacked a majority — and it needs no mechanism at all.

**How it goes wrong:** It doesn't answer elections. "Status quo prevails" between two new candidates for an open seat selects no one, and "the incumbent stays" is a seniority rule wearing different clothes (with the same insider bias). Use it for motions; pair it with something else for elections.

## What "random" must mean in a rule

A rule that says "the tie shall be broken by lot" has not finished the job. Vague random rules fail exactly when they are needed, because the losing side can contest the procedure instead of the outcome. A usable random rule specifies:

- **The mechanism** — a coin toss, names drawn from a container, or (if you adopt it) BetterVoting's published shuffle.
- **Who performs it** — a named officer, ideally one without a stake in the outcome.
- **Who witnesses it** — at minimum, the tied candidates or their representatives must be invited.
- **When and where** — at the meeting where results are announced, or at a scheduled time promptly after.
- **How it's recorded** — the result goes in the minutes.

{: .note }
> A physical draw performed by a named officer in front of the tied candidates is very hard to argue with. An unwitnessed coin toss reported after the fact is very easy to argue with — even when it was honest.

## Don't forget multi-winner elections

In practice, the most common tie is not for first place — it is for the **last seat** in a multi-winner election (three candidates for two committee seats, and the second and third finishers tie). Rules written with a single winner in mind often don't say what to do here.

Make sure your rule's language covers "any tie affecting which candidates are elected," not just "a tie for first place." The same options apply — but note that a repeat ballot for one remaining seat is effectively a runoff between the tied candidates, which is often simpler than repeating the whole election.

## Example wording to adapt

{: .note }
> This is an illustration to adapt to your organization's needs and governing documents, not legal advice or model bylaws.

> **Tie votes.** A tied vote on a motion fails. In any election, ties shall be resolved as follows: (a) ties shall first be broken using the tie-breaking protocol published by the balloting platform, if the ballots permit; (b) any tie remaining, including a tie affecting the final seat in a multi-seat election, shall be decided by lot. The Secretary shall conduct the draw by placing the tied candidates' names in identical folded slips in a container and drawing one, in the presence of at least two other members including, where practicable, the tied candidates or their representatives. The candidate drawn is elected. The method and result shall be recorded in the minutes.

Put the rule where it can be found and where it has authority. In order of durability:

- **Bylaws (or constitution)** — the strongest home. Hard to change, which is the point: it can't be quietly amended between the count and the announcement. Best for the permanent principle.
- **Standing rules / rules of procedure** — easier to adopt and amend; a fine home for the mechanical detail (who draws, who witnesses) if your bylaws already establish the principle.
- **A resolution adopted before a specific election** — the minimum viable version. If your bylaws are silent and the next election is soon, adopt the rule by resolution *before* ballots open, and record it in the minutes. It only protects that election — put it in the bylaws afterwards.

The one place a tie-breaking rule cannot live is in a decision made after the votes are counted.

## This may not be your decision to make

{: .warning }
> Organizations governed by statute, incorporation documents, or a parent body's rules may have the tie-breaking method already prescribed — many jurisdictions mandate resolution by lot for public elections, and corporate law in some places addresses casting votes. Check your governing documents and applicable law first; where they speak, they control, and nothing on this page overrides them. This page is general information, not legal advice.

## See also

- [Ties](ties.md) — BetterVoting's Official Tie-breaker Protocol in full, and how the random tie-breaker works.
- [Hand counting](hand_count.md) — if your rule involves re-examining ballots, know how a hand count works first.
- [Preliminary results](preliminary_results.md) — why you shouldn't announce a winner (or a tie) before results are final.
