---
layout: default
title: Polls and Multiple Races
nav_order: 18
parent: BetterVoting Documentation
---

# Polls and Multiple Races

BetterVoting runs everything from a thirty-second lunch poll to an election with several races on one ballot. This page covers the quick path for simple polls, how to put multiple questions on a single ballot, and how to reuse an election you've already built.

## Polls versus elections

When you create, BetterVoting first asks whether "poll" or "election" best describes your situation. This choice only changes the words you and your voters see — a poll says "question", "option", and "response" where an election says "race", "candidate", and "ballot", and the same substitution carries through emails and share links. Voting, security, and results work identically either way.

## Quick polls

From the home page, choose **Create an Election or Poll**. If you answer that your poll has just one question, you can build the whole thing on one screen: type the question, list the options, and pick the voting method. When you press Next, BetterVoting asks whether to **Publish Now** or **Customize in editor**.

### Publish Now

**Publish Now** makes the poll live immediately:

* Anyone with the link can respond — the poll is not listed on the public Browse Polls page, so the link is how people find it.
* Each device can respond once (enforced with a browser cookie).
* Results are public.
* There are no start or end times: the poll opens the moment you publish and stays open indefinitely.

You don't need an account, and no registration step interrupts the flow — you land straight on your live poll, ready to share its link.

{: .warning }
> A poll published this way is not attached to any account — even if you are signed in — and cannot be edited, closed, or reopened afterward. If you might want to manage the poll later, choose **Customize in editor** instead.

### Customize in editor

**Customize in editor** saves your question as a draft and opens the full editor, where everything on this page and more becomes available: additional races, a defined voter list, start and end times, and stricter voting limits (see [Security Options](security_options.md)).

### Working without an account

You can create and edit a draft without signing in, but that access is temporary: it works only from the same browser and expires 10 hours after the draft was created. A banner on the admin page offers to attach the draft to a free account — sign in from that browser and the draft becomes permanently yours. Finalizing a draft (making it ready for real voters) always requires an account.

## Multiple races on one ballot

One election can carry as many races as you need — a board seat, a budget measure, and a venue pick can all ride on the same ballot. In the creation wizard, answer **More than one** to the race-count question, give the election a title, and add the races in the editor. You can also add races to any single-race draft with the **Add Race** button on the ballot editor.

Each race has its own:

* title, description, and candidate list (with optional write-ins),
* **voting method**, and
* **number of winners**.

That last pair is worth underlining: the method is chosen per race, not per election. A single ballot can ask a STAR Voting question, an Approval question, and a Ranked Choice question side by side. For each race you first choose single-winner, bloc multi-winner, or proportional multi-winner; the featured methods are STAR Voting, Ranked Robin, and Approval Voting (with Choose One Plurality and Ranked Choice Voting under "More Options"), and for proportional races Proportional STAR Voting (with Single Transferable Vote under "More Options").

Races can only be added, edited, duplicated, or deleted while the election is still a draft.

{: .note }
> Any change to a race — adding, editing, duplicating, or deleting one — clears all test ballots cast so far. Test ballots are also deleted automatically when you finalize.

### What voters see

A multi-race ballot presents **one race per page**. Voters step through with Next and Previous buttons, and a row of progress dots between them shows every race at a glance: a dot for a race not yet marked, a check for a race with a choice, and a warning icon if something on that page needs attention. Tapping a dot jumps straight to that race.

Voters don't have to mark every race — a race left blank is counted as an abstention for that race only. Before anything is cast, a review screen lists every race with the voter's choices (or "abstention"), and one Submit casts the whole ballot at once.

Results are tabulated and displayed separately for each race.

## Same question, two voting methods

Because each race carries its own voting method, there's a trick worth knowing: **duplicate a race and give the copy a different method**. In the ballot editor, each race card has a duplicate button; the copy appears with the same candidates and "Copy Of" prefixed to its title. Change the copy's voting method and your voters answer the same question twice — once per method.

This is the easiest way to compare voting methods on real ballots with real stakes: same voters, same candidates, same moment. You see how the ballot experience differs and whether the winners agree — and when they disagree, you've learned something about the methods, not just the race.

## Reusing an election

There is no separate template feature — the way to reuse an election is to **duplicate** it. On the election's Admin page, the **Duplicate** button creates a copy of the election as a new draft you own, titled "Copy of" the original, and opens it in the editor.

The copy carries over the full setup: every race with its candidates, the description, the settings, and any scheduled start and end times. It does **not** copy ballots or the voter list — the copy starts with zero votes and an empty voter roll.

This makes duplication the natural workflow for recurring elections: run this year's board election by duplicating last year's, swap in the new candidates, and re-add the voters. Archiving an election prevents further changes to it, but you can still duplicate it — so an archived election works fine as a frozen master copy.

{: .note }
> Scheduled start and end times are copied along with everything else. Before finalizing a duplicated election, check its dates — they're last time's.
