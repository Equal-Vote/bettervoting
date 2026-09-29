---
layout: default
title: Reading Your Results
nav_order: 9
parent: BetterVoting Documentation
---

{:toc}

# Reading Your Results

A BetterVoting results page is a stack of sections, and each one answers a different question about the same ballots. The headline tells you who won. The two round charts show how the winner was found. **Race Details** gives you the exact numbers. **Stats for Nerds** offers extra analyses of the ballot data for anyone who wants to dig deeper.

The first two sections are the result. The rest is detail. This page walks through a STAR Voting results page from top to bottom; other methods share the same layout, with charts and panels suited to their ballots.

## The headline

The top of the page names the winner, the number of voters, and the voting method.

Two notes on what you see there:

- **"PRELIMINARY RESULTS"** is about the election's status, not about confidence in the count. Results stay labeled preliminary until the election is closed — see [Preliminary Results](preliminary_results.md).
- **The voter count is the number of ballots in the tally.** A ballot that scores every candidate the same — including all zeros or all fives — expresses no preference between anyone, so it is set aside as an abstention and does not appear in this count.

## The two round charts

STAR Voting counts in two rounds, and the page shows one chart for each.

**Scoring Round.** Every star on every ballot is added up, and each candidate's bar is their total. The two highest-scoring candidates become the **finalists** and advance to the runoff. If two candidates tie for a finalist spot, a tiebreaker picks who advances — see [Ties](ties.md).

**Automatic Runoff Round.** Only the two finalists appear. Your ballot now counts as one full vote for whichever finalist you scored higher — a five-star gap and a one-star gap are the same single vote here. Ballots that scored both finalists the same go into a third bar, **Equal Support**: they expressed no preference between the two, so they are counted for neither.

The finalist preferred by more voters wins. Because the scoring round asks *how much* support each candidate has and the runoff asks *how many* voters prefer each finalist, the candidate with the most stars is not always the winner — when they come apart, the runoff result stands, since that is the round that counts each voter equally.

**The dashed line is the majority threshold**, and its label matters: it marks half of the voters *with a preference*, not half of everyone. If 40 of 100 voters land in Equal Support, the remaining 60 decide the race, and the threshold sits at 30 — which is 30% on the chart's all-voters scale. That is how a winner can show well under 50% on the chart and still hold a majority of the voters who chose between the finalists.

Two controls live on this card: a toggle between the bar chart and a pie chart of just the two finalists, and a switch between percentages and raw vote counts. On a small election, the raw counts are the easier read.

## Race Details

Expand **Race Details** for the same two rounds as tables.

The **Scores Table** lists every candidate's star total, with the two finalists highlighted.

The **Runoff Table** shows each finalist's runoff votes under two percentage columns:

- **% Runoff Votes** — out of *all* voters, including Equal Support. This column sums to 100%, and its job is to show how large the no-preference group was.
- **% Between Finalists** — out of only the voters who preferred one finalist to the other. Equal Support has no entry here, because those are exactly the ballots removed to build this denominator. **This is the column that decides the race**, and it is where the winner's majority appears.

When Equal Support is 0, the two columns are identical — there is nothing to remove.

## Stats for Nerds

Expand **Stats for Nerds** and a dropdown offers several analyses. These read the anonymized ballots directly, so each panel is its own count with its own definition — and its own denominator. Most "wait, that can't be right" moments on a results page come from reading one of these panels as if it were the headline result. It never is; each answers a narrower question.

### Tabulation Steps

Not an analysis — the count itself, narrated round by round. If any tiebreaker had to run, this is where it is named and explained, step by step. When you want to check the result by hand, this panel is the script to follow (and [Hand Count](hand_count.md) shows the same process on paper).

### Head-to-Head Matchups

Pick a candidate and get one bar per opponent: that candidate against each rival, one on one, with all other candidates ignored.

Each bar has three bands — voters who gave more stars to the selected candidate, voters who scored the two the same, and voters who gave more stars to the opponent. The three bands add up to all voters, and a star marks the side that won the pair.

Watch for the middle band. A candidate can win a matchup with 40% against 20% while 40% of voters scored the pair equally. A head-to-head win means *more voters preferred one than the other* — not a majority of everybody.

This panel also shows you the full preference landscape: a candidate who beats every rival head to head, or a candidate who loses every pairing, is visible at a glance, one bar at a time.

### Distribution of Equal Support

The runoff chart already tells you *how many* voters scored the two finalists equally. This panel tells you *at what star level* they tied them.

That distinction has no effect on the outcome — an equal ballot is equal — but it is the only place on the page where the character of the no-preference group shows. Voters tying both finalists at five stars are saying "I'd be happy with either"; voters tying them at zero are saying "neither of these." Both count identically in the runoff, and they mean opposite things.

### Average Supporter Profile

The most misread panel on the page, because of one word. **"Supporters" here means ballots that gave that candidate five stars** — the maximum score. Not everyone who liked them, and not everyone who scored them highest on their own ballot.

Pick a candidate and the panel averages just those maximum-score ballots: what did this candidate's strongest backers think of everyone else? It also shows which frontrunner those voters preferred, and what share of them scored no other candidate at all — the bullet-voting share.

Two cautions:

{: .note }
> **The sample can be tiny.** A profile built from a handful of five-star ballots is not an electorate-wide statistic. Check the voter count at the top of the panel before quoting it.

An empty profile is not an error. A candidate can finish a close second on total stars while no single voter gave them a five — broadly liked, with no maximum-intensity base. The empty panel is reporting that fact.

## Related pages

- [Preliminary Results](preliminary_results.md) — what the preliminary label means and when results become final
- [Ties](ties.md) — how tied rounds and tied finalist spots are resolved
- [Hand Count](hand_count.md) — counting a STAR election by hand, round by round
- [Frequently Asked Questions](faq.md)
