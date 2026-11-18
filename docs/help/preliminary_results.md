---
layout: default
title: Preliminary Results
nav_order: 1
parent: Counting and Results
grand_parent: Running an Election
---

# Preliminary Results

Preliminary results are results revealed while an election is still open: the running tally is visible to anyone with the election link while voting is still happening. This is great for casual polls, transparent community decisions, and demos — but it changes how the election behaves in some ways that voters and admins should understand before turning it on.

**Preliminary results are not allowed by default.** An election only has them if **Allow Preliminary Results** was turned on in its **Settings** before it was finalized. That setting cannot be changed afterwards. With it off, nobody, the election's admins included, can see a tally until the election is closed.

**Revealing results is one switch.** The **Reveal Results** switch on the **Publish & Share** page makes the results public. Once an election is closed it always works, and it reveals the final results. While the election is still open it only works if the election allows preliminary results, and BetterVoting first shows a warning that links to this page. Results are never revealed automatically: closing an election, by hand or at its end time, leaves them hidden until an admin turns the switch on.

**It goes in the audit log.** Revealing or hiding results is recorded in the election's audit log, and an entry for results revealed while voting was still open says so.

**If you reopen an election** that does not allow preliminary results, its results are hidden again until it is closed.

This page is for both voters (so you know what other people can see when you vote) and admins (so you can make an informed choice about whether to enable it).

## What preliminary results actually show

When results are revealed while the election is open:

- Anyone who visits the election page sees a **Preliminary Results** view with the current tally.
- The tally updates as ballots come in. A new ballot changes the numbers immediately.
- After the election closes, the same view becomes the final results.

Otherwise the tally is hidden from everyone (both admins and voters) until the election is closed and the results are revealed.

## What admins can see during an election

Independent of this setting, the admin always has access to a voter list that shows **which voters have cast a ballot and which have not**. This is part of how the email-list and ID-list flows work — admins need it to know who to remind. Admins do **not** see the contents of individual ballots: BetterVoting hides the link between a voter and their specific ballot.

> **However**, if preliminary results are visible, an admin (or anyone watching the live tally) can combine the live tally with the voter-status list to infer some voters' choices. The simplest version: if only one voter casts a ballot during some window, the change in the tally during that window *is* that voter's ballot. With small numbers of voters or quiet periods, this kind of "delta analysis" can de-anonymize individual votes even though no single screen explicitly shows them.

This is not a bug — it's a fundamental consequence of showing tallies live alongside a per-voter status list. If ballot secrecy matters to your election, leave **Allow Preliminary Results** off.

## Preliminary results combined with editable ballots

BetterVoting has a separate setting called **Allow Voters To Edit Vote** that lets voters change their ballot until the election closes. When an election has that setting and shows preliminary results at the same time, voters can see how the election is going and then change their votes in response.

This is a legitimate feature for some kinds of polls (e.g. deliberative groups that want to converge through discussion and revision). It also opens the door to **coordinated vote-switching**:

- A campaign, faction, or chat group can watch the live tally together.
- When their preferred candidate is behind, they can direct supporters to switch their vote to a backup choice, change rankings, or alter scores.
- Because edits are silent and there is no rate limit, a coordinated swing in the final minutes can land before other voters notice.

The methods on BetterVoting, are designed to reduce the incentive to vote strategically, but this combination partially undoes that benefit. **If you are running a serious election and want sincere ballots, we recommend either leaving preliminary results off, or turning off editable ballots.** BetterVoting will let you enable both, but you should do so deliberately.

## Hiding results after they have been revealed

An admin can turn **Reveal Results** off at any time, and the tally page will stop being visible to voters and the public from that point forward.

> **Hiding results does not un-reveal what has already been seen.** Anyone who looked at the tally while it was visible may have screenshotted, shared, or simply remembered it. Search engines, social media, and chat platforms can also retain copies. Treat the decision to show preliminary results as effectively one-way for any number you wouldn't want public, even briefly.

In an election that allows preliminary results, revealing them mid-election immediately exposes the full current tally.

## Recommendations

- **Casual polls, demos, opinion gathering**: Showing preliminary results is usually fine, and often what people expect.
- **Serious elections where ballot secrecy matters**: Leave **Allow Preliminary Results** off. Reveal the final results after the election is closed.
- **Serious elections where you want sincere ballots**: Do not combine preliminary results with editable ballots. Pick one.
- **If you change your mind**: Remember that hiding results doesn't undo what was already visible.

## Related

- [Security Options](https://docs.bettervoting.com/help/security_options.html) — voter authentication and ballot-list options.
- For more questions, reach out to our team at elections@equal.vote.
