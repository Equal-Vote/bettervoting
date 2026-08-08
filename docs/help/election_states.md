---
layout: default
title: Election States
nav_order: 1
parent: BetterVoting Documentation
---

# Election States

Every election on BetterVoting is in one of five states: **draft**, **finalized**, **open**, **closed**, or **archived**. The state is shown next to your election's title, and in the State column of your elections list.

It's worth knowing which one you're in, because most "can I still do this?" questions are really state questions. Can I add a candidate? Can I change the end date? Why can't my voters see the ballot yet? The answer is almost always determined by the state.

## The short version

| State | Can voters cast a ballot? | Can you edit the election? |
|:---|:---|:---|
| **Draft** | Yes — but they're test ballots | Yes, anything |
| **Finalized** | No | No |
| **Open** | Yes — these are the real ballots | No |
| **Closed** | No | No |
| **Archived** | No | No |

The key thing that surprises people: **you can only edit an election while it's in draft**. Once you finalize, the ballot is locked — not just while voting is happening, but from that moment onward. So use draft time generously.

## Draft

This is where an election starts, and it's the only state where you can change things. Add and remove candidates, rename races, pick a voting method, set your dates, build your voter list — all of it is freely editable here.

Draft is also **BetterVoting's test mode**. You can send your ballot link to yourself or a colleague and cast a ballot to see how it looks and works. Any emails BetterVoting sends during draft carry a warning saying the election is still in test mode.

{: .warning }
> **Test ballots are deleted when you finalize.** This is automatic and cannot be undone. Anyone who voted during draft will need to vote again once the election opens — the warning in the invitation email tells them so.

### What a test vote does and doesn't tell you

A draft test is genuinely useful for checking:

* how your ballot looks and reads, on the device your voters will use
* that your candidates and races are right
* what your invitation email actually says when it arrives
* the whole flow, from link to submitted ballot

But there are things a test vote **cannot** tell you, because draft skips the checks that a real election runs:

* **Whether your voter restrictions work.** Voter authentication and the voter list aren't enforced during draft, so a test ballot will go through even from someone who wouldn't be allowed to vote in the real election. If you're testing a restricted election and the ballot submits, that hasn't confirmed your restrictions — it's just draft being permissive.
* **Whether one-person-one-vote is working.** The same check is skipped, so you can submit as many test ballots as you like.
* **Whether editable ballots work.** If you've turned on the option that lets voters change their vote, it doesn't apply during draft — voting twice creates two ballots rather than updating the first.

None of this is a problem, it's just what "test mode" means here. Those settings all take effect the moment you finalize.

## Finalized

Finalizing is how you say the election is ready. It does three things: locks the election against further edits, deletes the test ballots, and makes the election official.

An election sits in **finalized** when it's official but **voting hasn't started yet** — you set a start time and that time is still in the future. Voters can't cast a ballot yet.

{: .warning }
> **Finalizing is one-way, and you can only do it once.** There's no way back to draft. Make your changes before you finalize, not after.

{: .important }
> **If you didn't set a start time, finalizing opens your election immediately.** There's no pause. If you want a gap between finalizing and voting starting, set a start time.

## Open

The election is live and voters can cast real ballots. This is the only state where an ordinary vote counts.

You still can't edit the election — that ended at finalize.

An election becomes open either when its start time arrives, or right away on finalizing if no start time was set.

## Closed

Voting has finished. Ballots can no longer be cast, and you can view your results.

An election closes when its end time passes. If you didn't set an end time, it won't close on its own — see below.

## Archived

Archiving is for elections you're finished with and want out of the way. An archived election can still be viewed, but nobody can vote in it and nothing about it can be changed.

You can archive an election from any state, so archiving is also how you shelve a draft you've decided not to run.

## How elections move between states

There are two ways an election changes state, and **which one applies depends on whether you set dates**.

**If you set a start and end time**, BetterVoting handles the transitions for you. The election opens when the start time arrives and closes when the end time passes. You can't open or close it by hand — if you try, you'll see *"Cannot open or close an election with scheduled start and end times."*

**If you didn't set times**, nothing happens automatically, and you open and close the election yourself from the Publish & Share screen. Note that finalizing an election with no start time opens it straight away.

{: .note }
> **An election with no end time will not close by itself.** It stays open until you close it manually. If you want voting to stop at a particular moment, set an end time.

## Common questions

**Can I go back to draft to fix something?**
No. Finalizing is one-way. If the election hasn't started yet you can archive it and set up a new one; if it's already open, you'll have to run it as it stands.

**My voters say they can't see the ballot.**
Check the state. If it says *finalized*, voting hasn't started — either the start time is still in the future, or you haven't opened it yet. Only *open* elections accept ballots.

**I finalized and my test votes disappeared.**
That's expected — finalizing deletes them so the real count starts from zero.

**Can I extend an election that's already running?**
No. The dates are part of the election and are locked once you finalize.

**I archived an election by mistake.**
The results are still there and still viewable. But an archived election can't be reopened, so if you needed it running you'll need a new one.

## Related

* [Preliminary Results](preliminary_results.md) — what your voters can see while an election is still open
* [Security Options](security_options.md) — the voter access settings that take effect once you finalize
