---
layout: default
title: Preliminary Results
nav_order: 8
parent: BetterVoting Documentation
---

# Preliminary Results

When an election has **Show Preliminary Results** turned on, the running tally is visible to anyone with the election link while voting is still happening. This is great for casual polls, transparent community decisions, and demos — but it changes how the election behaves in some ways that voters and admins should understand before turning it on.

This page is for both voters (so you know what other people can see when you vote) and admins (so you can make an informed choice about whether to enable it).

## What "Show Preliminary Results" actually shows

When the setting is on:

- Anyone who visits the election page sees a **Preliminary Results** view with the current tally.
- The tally updates as ballots come in. A new ballot changes the numbers immediately.
- After the election closes, the same view becomes the final results.

When the setting is off, the tally is hidden from everyone (both admins and voters) until the election is closed and the admin chooses to publish.

## What admins can see during an election

Independent of this setting, the admin always has access to a voter list that shows **which voters have cast a ballot and which have not**. This is part of how the email-list and ID-list flows work — admins need it to know who to remind. Admins do **not** see the contents of individual ballots: BetterVoting hides the link between a voter and their specific ballot.

> **However**, if preliminary results are visible, an admin (or anyone watching the live tally) can combine the live tally with the voter-status list to infer some voters' choices. The simplest version: if only one voter casts a ballot during some window, the change in the tally during that window *is* that voter's ballot. With small numbers of voters or quiet periods, this kind of "delta analysis" can de-anonymize individual votes even though no single screen explicitly shows them.

This is not a bug — it's a fundamental consequence of showing tallies live alongside a per-voter status list. If ballot secrecy matters to your election, leave preliminary results off until the election closes.

## Preliminary results combined with editable ballots

BetterVoting has a separate setting called **Allow Voters To Edit Vote** that lets voters change their ballot until the election closes. When both settings are enabled at the same time, voters can see how the election is going and then change their votes in response.

This is a legitimate feature for some kinds of polls (e.g. deliberative groups that want to converge through discussion and revision). It also opens the door to **coordinated vote-switching**:

- A campaign, faction, or chat group can watch the live tally together.
- When their preferred candidate is behind, they can direct supporters to switch their vote to a backup choice, change rankings, or alter scores.
- Because edits are silent and there is no rate limit, a coordinated swing in the final minutes can land before other voters notice.

The methods on BetterVoting, are designed to reduce the incentive to vote strategically, but this combination partially undoes that benefit. **If you are running a serious election and want sincere ballots, we recommend either leaving preliminary results off until the election closes, or turning off editable ballots.** BetterVoting will let you enable both, but you should do so deliberately.

## Turning the setting off after it has been on

An admin can turn **Show Preliminary Results** off at any time, and the tally page will stop being visible to voters and the public from that point forward.

> **Turning the setting off does not un-reveal what has already been seen.** Anyone who looked at the tally while it was visible may have screenshotted, shared, or simply remembered it. Search engines, social media, and chat platforms can also retain copies. Treat the decision to show preliminary results as effectively one-way for any number you wouldn't want public, even briefly.

The reverse switch — turning preliminary results **on** mid-election — is also possible, and it immediately exposes the full current tally.

## Recommendations

- **Casual polls, demos, opinion gathering**: Showing preliminary results is usually fine, and often what people expect.
- **Serious elections where ballot secrecy matters**: Leave preliminary results off until the election is closed. Publish the final results after close.
- **Serious elections where you want sincere ballots**: Do not combine preliminary results with editable ballots. Pick one.
- **If you change your mind**: Remember that turning the setting off doesn't undo what was already visible.

## Related

- [Security Options](https://docs.bettervoting.com/help/security_options.html) — voter authentication and ballot-list options.
- For more questions, reach out to our team at elections@equal.vote.
