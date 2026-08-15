---
layout: default
title: Frequently Asked Questions
nav_order: 99
parent: BetterVoting Documentation
---

# Frequently Asked Questions

- [How do you run races with "None of the Above"?](#how-do-you-run-races-with-none-of-the-above)
- [What does "write-in scores not counted" mean?](#write-in-scores-not-counted)
- [Why is the top scoring candidate different from the winner?](#top-scorer-vs-winner)

## How do you run races with "None of the Above"?

Some elections require including “None of the Above” (NOTA) as an option. On BetterVoting.com, you can include NOTA by simply adding “None of the Above” as a candidate. If NOTA wins, the election may need to be repeated. If NOTA receives a majority but does not win, the election would proceed according to your organization’s bylaws.

Most voting methods on BetterVoting allow voters to support multiple candidates, which can include NOTA. For example, in an Approval voting election, a voter could select both a candidate and “None of the Above.” This aligns with Equal Vote’s principle that voters should be able to express their full and honest opinions, and that their vote should always be able to make a difference—even if their favorite candidate can’t win.

## What does “write-in scores not counted” mean?
{: #write-in-scores-not-counted}

When write-in candidates are enabled for a race, voters can add candidates that aren’t on the official ballot. Before these write-in candidates appear in results, an election administrator must review and approve them. This prevents misspellings, duplicates, and joke entries from cluttering the results.

A “score” in this context is one voter’s rating of one candidate. For example, if three voters each rated an unapproved write-in, that’s three scores not counted. If one voter writes in two candidates and neither is approved, that’s two scores not counted. The message tells you how many of these individual ratings were excluded from the tabulation because they were cast for write-in candidates that have not been approved. This can happen because:

- **The admin hasn’t reviewed write-ins yet.** Write-in candidates start unapproved and must be explicitly approved by an admin before they are included in results.
- **The admin chose not to approve a write-in.** For example, joke entries or candidates who are ineligible may be intentionally excluded.

If you are an election admin, you can review and approve write-in candidates from the admin panel by clicking the pencil icon next to any race with write-ins enabled.

## Why is the top scoring candidate different from the winner?
{: #top-scorer-vs-winner}

STAR Voting is counted in two rounds, and they measure two different things. The scoring round measures **how much** support each candidate has. The runoff round measures **how many** voters prefer one finalist to the other. Usually the same candidate leads both. When they differ, the runoff decides it — and that is by design, not a quirk of the count.

The reason the two rounds can disagree is that the runoff throws away the size of a preference and keeps only its direction:

| A ballot scoring… | In the scoring round | In the runoff |
|---|---|---|
| Ada 5, Ben 4 | a 1-star edge for Ada — small | one full vote for Ada |
| Ada 5, Ben 0 | a 5-star edge for Ada — large | one full vote for Ada |
| Ada 3, Ben 3 | no edge either way | no vote either way — [equal support](https://www.starvoting.org/equal_preference) |

So a candidate can lead the scoring round on a handful of enthusiastic ballots while more voters — counting one voter, one vote — prefer the other finalist. The runoff winner is the one **more voters preferred**, which is what "majority" means, and it is the reason a voter can score their honest favourite top without worrying that doing so throws the election.

The runoff is also why scoring everyone at the extremes is not required to be heard: your full vote goes to whichever finalist you scored higher, however small the gap you gave them.
