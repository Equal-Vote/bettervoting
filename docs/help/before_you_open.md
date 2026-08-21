---
layout: default
title: Before You Open Your Election
nav_order: 6
parent: BetterVoting Documentation
---

# Before You Open Your Election

Finalizing is the point of no return. This is what to check before you press it.

**Why it matters:** you can edit an election freely while it's a **draft**, and not at all afterwards. Finalizing is one-way, it can only be done once, and there's no route back to draft. Everything below is easy to fix now and impossible to fix in ten minutes' time.

## The checklist

### Your candidates and races

- [ ] **Every candidate is spelled the way they want to be seen.** Names appear on the ballot, in results, and in exports.
- [ ] **Nobody is missing.** Adding a candidate after finalizing means starting a new election.
- [ ] **Each race asks what you meant it to ask.** Race titles are what voters read above the ballot.
- [ ] **The number of winners is right for each race.** One seat and three seats are different elections, not a setting you can nudge later.

### Your method

- [ ] **The voting method suits the race.** If you're unsure, see the guide to choosing a voting method.
- [ ] **For multi-winner races, you've chosen Basic or Proportional deliberately.** These give genuinely different results — under Basic, a majority bloc can take every seat. This is the setting most often picked by accident.

### Your dates

- [ ] **You've set a start time, or you intend voting to begin immediately.** With no start time, finalizing opens the election **straight away** — there is no pause to check your work.
- [ ] **You've set an end time, or you intend to close it by hand.** With no end time, the election **never closes on its own**. It stays open until you close it.
- [ ] **The time zone is right.** Your dates display in the time zone set on the election, not your browser's.

Note that scheduled dates and manual control are mutually exclusive: if you set start and end times, you can't open or close by hand, and BetterVoting will tell you so.

### Your voters

- [ ] **The voter list is complete.** In a restricted election, anyone not on the list can't vote.
- [ ] **The email addresses are right.** A typo means a voter never receives their link.
- [ ] **You've decided whether voters may change their vote after submitting.** This is a setting, and voters see a different message depending on it.
- [ ] **You've set a support email** if you want voters to be able to reach you. It appears on the election page, and it's the difference between a confused voter contacting you and a confused voter giving up.

### Your test run

- [ ] **You've voted on your own ballot in draft**, on the device your voters are likely to use.
- [ ] **You've read the invitation email as a voter receives it**, not as you imagine it.
- [ ] **You understand what your test did *not* prove.** A draft test skips voter authentication, the voter roll, one-person-one-vote and ballot updates. If your election is restricted, a successful test ballot has **not** confirmed that your restrictions work — draft is simply permissive.

## Then finalize

When you finalize, three things happen at once:

1. The election is locked against further edits.
2. **All test ballots are deleted.** This is automatic and can't be undone. Anyone who voted during your test will need to vote again.
3. The election becomes official — and if you set no start time, it opens immediately.

## After you open

There is genuinely very little to do, which is the point.

- **Watch for voters who haven't voted.** In a restricted election you can see who has and hasn't, and send reminders to just the ones who haven't.
- **If a voter never received their link**, you can retrieve their unique voting URL and send it to them directly. That action is recorded in the audit log.
- **Decide about preliminary results before anyone asks.** If they're on, voters see running totals as soon as they've voted. Early numbers move around a lot, and the candidate ahead early often isn't the winner.
- **Don't expect to fix anything.** Dates, candidates, method and seats are all locked. If something is badly wrong, the honest options are to let it run or to start again — and starting again means telling your voters why.

## Related

* [Security Options](security_options.md) — voter lists, IDs, and open elections
* [Preliminary Results](preliminary_results.md) — what voters can see while voting is open
