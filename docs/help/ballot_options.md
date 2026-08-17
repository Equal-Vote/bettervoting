---
layout: default
title: Ballot Options
nav_order: 13
parent: BetterVoting Documentation
---

# Ballot Options

Several settings change what the ballot looks like and how voters interact with it. Most of them live on the **Settings** page of your election's admin panel; write-in candidates are enabled per race in the race editor. This page explains what each option does, what the voter sees, and when you would want it.

{: .note }
> Ballot options can only be changed while your election is still a **draft**. Once voting opens, the ballot is locked so that every voter votes on the same ballot. (Results visibility is the exception — see [Preliminary Results](preliminary_results.md).)

## Quick reference

| Setting | What it does | Default |
|---|---|---|
| Randomize Candidate Order | Shuffles the candidate list each time a ballot is loaded | On |
| Allow Voters To Edit Vote | Lets a voter replace their ballot while voting is open | Off |
| Confirm That Voter Read Instructions | Blurs the ballot until the voter confirms they read the instructions | Off |
| Use Draggable Ballots for RCV | Replaces the RCV bubble grid with a drag-and-drop interface | Off |
| Set Number Of Rankings Allowed | Caps how many ranking columns a ranked ballot shows | 6 (choose 3–8) |
| Write-in candidates (per race) | Lets voters add candidates who aren't on the ballot | Off |

Randomized order, instruction confirmation, vote editing, and write-ins work with every voting method. The rank limit applies to every ranked method (RCV, STV, Ranked Robin); the drag-and-drop option applies to RCV races. The skipped-rank rule discussed at the end of this page affects RCV counting only.

## Randomize Candidate Order

When this is on, each ballot page shuffles the candidates into a fresh random order every time it loads — two voters (or the same voter reloading the page) will generally see different orders. This counteracts ballot-order bias: candidates listed first tend to pick up extra support simply for being first, so randomizing spreads that advantage evenly instead of giving it to whoever you happened to list first.

When it's off, candidates appear in the order you arranged them in the race editor.

Two kinds of entries are never shuffled: a "None of the Above" option and the write-in section always stay at the bottom of the ballot, where voters expect them.

This option is on by default. Turn it off only if your candidate order is meaningful in itself — for example, an ordered list of proposals.

## Confirm That Voter Read Instructions

When this is on, each race's ballot appears **blurred** and cannot be marked until the voter ticks a checkbox labeled *"I have read the instructions"* beneath the ballot instructions. Once ticked, the ballot unblurs and the checkbox stays checked.

The confirmation is per race — in a multi-race election, the voter confirms on each ballot page.

This is worth enabling when your voters are new to the voting method. STAR, RCV, and Approval ballots each come with short instructions at the top of the ballot, and this checkbox makes sure voters at least pause on them before marking anything.

## Allow Voters To Edit Vote

When this is on, a voter who has already voted can come back and submit a new ballot any time before the election ends. The new ballot **replaces** the old one — each voter still has exactly one ballot in the count, and the ballot's history records that it was updated.

What the voter sees:

- After submitting, the confirmation page shows an **Update Vote** button while the election is open.
- The voter's email receipt contains a link they can use to return and update their ballot.
- The ballot verification page tells voters whether updates are allowed: with updates off it says all ballots are final once submitted; with updates on it points to the receipt link, and once the election closes it says all ballots are final.

{: .important }
> Vote editing is only available for elections that invite voters by **email list**. It is not permitted on open-access elections, because updating a ballot requires knowing reliably which voter it belongs to.

Enable this for lower-stakes polls where you want voters to be able to react to new information (a rescheduled event, a candidate dropping out). For high-stakes elections, most administrators leave it off so that a submitted ballot is final.

## Use Draggable Ballots for RCV

This option only affects races using **Ranked Choice Voting (RCV)**. It replaces the standard ranking grid with a drag-and-drop interface.

**Off (the default):** voters see a bubble grid — one row per candidate, one column per rank — and fill in one bubble per candidate. Because a grid lets voters make mistakes, the ballot warns about them as they mark it:

- Skipping a rank shows a warning: *"Do not skip rankings. Rank candidates in order to clearly show preferences. Candidates left blank are ranked last."*
- Giving two candidates the same rank shows an error: *"Do not rank multiple candidates equally. (Ranking candidates equally can void your ballot.)"*

**On:** voters see two lists — *Available Candidates* on the left and *Your Rankings* on the right — and drag candidates across to build their ranking from the top down. The ranking is just the order of the right-hand list, so skipped ranks and duplicate ranks are impossible by construction. Voters can drag candidates back out or reorder them freely before submitting.

The drag interface is friendlier for voters on a touchscreen and eliminates the two most common ranked-ballot mistakes. The bubble grid is closer to what official paper RCV ballots look like, which matters if you are mirroring a governmental election or planning a [hand count](hand_count.md).

## Set Number Of Rankings Allowed

For ranked ballots, this sets how many ranking columns the ballot shows — you can choose between 3 and 8, and the default is 6. If a race has fewer candidates than the limit, the ballot only shows as many columns as there are candidates.

Voters can rank up to that many candidates; anyone they leave unranked is simply ranked below everyone they did rank. A voter doesn't need to use all the columns — ranking just one candidate is a valid ballot.

Why limit rankings at all? With a large candidate field, a full ranking grid becomes wide and unwieldy, and real-world RCV jurisdictions typically cap rankings the same way (New York City's official ballots allow 5, for example). Six is a comfortable middle ground: enough columns for voters to express meaningful preferences, few enough to keep the ballot readable.

## Write-in candidates

Write-ins are enabled **per race**, not per election: in the race editor, click **+ Add Write-in** under the candidate list while the election is a draft. A "Write-in" entry appears at the bottom of the candidate list to show voters will have the option.

**What the voter sees:** below the candidate list, the ballot shows a *Write-in Candidates* box. The voter types a name, clicks **Add**, and the name appears as a new row on the ballot to be scored, ranked, or approved exactly like any listed candidate. A voter can add up to 5 write-ins, remove one they've added, and cannot add a name that duplicates an existing candidate.

**How write-ins are counted:** write-in votes do **not** count automatically. After ballots come in, an administrator reviews the write-in names — click the pencil icon next to the race in the admin panel. The review table groups names that differ only in capitalization or surrounding spaces, shows how many ballots each name appeared on, and lets you:

- **Approve** a write-in, adding it to the results as a real candidate. Every score or ranking cast for that name (under any capitalization) then counts.
- Set its **official name** — the display name used in results. Only capitalization changes are allowed, so "john smith" can become "John Smith".
- Leave it unapproved — for example, misspellings you've merged elsewhere, ineligible people, or joke entries.

Ratings cast for write-ins that are not (or not yet) approved are excluded from the count, and the results page reports how many ratings were excluded. See [What does "write-in scores not counted" mean?](faq.md#write-in-scores-not-counted) for how to read that message.

{: .note }
> Approval is not a one-time deadline. You can review and approve write-ins after the election closes, and the results will include them once approved.

## Ballot exhaustion: the skipped-rank rule

This one applies only to RCV counting, and it exists mainly for faithfully reproducing real-world elections.

In RCV, your ballot counts for your highest-ranked candidate still in the running; when that candidate is eliminated, it moves to your next ranking. A ballot becomes **exhausted** — stops counting — when it has no ranked candidates left in the race. Two ballot-marking mistakes can also exhaust a ballot early:

- **Repeated skipped rankings.** Some jurisdictions' laws say that if a voter skips too many ranks in a row (for example, marks a 1st choice and a 4th choice but no 2nd or 3rd), the ballot stops counting when the count reaches the gap. Alaska and New York City, for example, void a ballot at a run of two or more consecutive skipped ranks.
- **Duplicate rankings (overvotes).** When two candidates share one rank, the count cannot tell which of them the voter meant. On paper ballots from real-world elections uploaded to BetterVoting, such an overvote exhausts the ballot when the count reaches that rank. BetterVoting's own online ballot heads this off before submission instead: the bubble grid flags equal rankings with an error message, and the drag-and-drop ballot makes them impossible.

**BetterVoting's default is forgiving:** skipped rankings never void a ballot — the count simply moves on to the voter's next ranked choice. The strict skipped-rank rule is applied to elections uploaded to the public archive of real-world RCV elections, where it is set to match each jurisdiction's law so the reproduced count matches the official one. It is not currently offered in the election settings screen.

When a strict rule was in effect, the results page says so under voter errors: *"This jurisdiction voided ballots if they had N or more repeated skipped ranks."*

## Related pages

- [Security Options](security_options.md) — who can vote and how voters are verified
- [Preliminary Results](preliminary_results.md) — controlling when voters see results
- [Frequently Asked Questions](faq.md) — including write-in scores and "None of the Above"
