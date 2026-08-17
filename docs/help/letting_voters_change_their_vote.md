---
layout: default
title: Letting Voters Change Their Vote
nav_order: 16
parent: BetterVoting Documentation
---

# Letting Voters Change Their Vote

BetterVoting elections have a setting called **Allow Voters To Edit Vote**. When it is on, a voter who has already cast a ballot can come back and submit a new one at any time while the election is open. Only their latest ballot is counted — each voter still contributes exactly one ballot to the results.

Whether to turn it on is a genuine decision, not a default. This page explains how the feature works, the trade-off behind it, and three specific cautions to keep in mind.

## How it works

- **It is only available on email-list elections.** Vote updating requires knowing reliably which ballot belongs to which voter, so it is only supported when your election uses an email list for the voter roll. On other election types the setting is disabled with the message "Only supported when election uses email list". See [Security Options](security_options.md) for the election types.
- **Turn it on while the election is a draft.** Like most settings, it can only be changed before the election is finalized.
- **Voters update by returning through their unique voting link.** After voting, the election page shows an **Update Vote** button, and the email receipt each voter receives includes a link to update their ballot while the election is still open.
- **Submitting again replaces the earlier ballot.** The voter fills out the whole ballot fresh; the new submission takes the place of the old one, and the update is recorded in the ballot's history with a timestamp.
- **Updates stop when the election closes.** The final results count each voter's last submitted ballot.

The page where a voter verifies their ballot tells them which rules apply, with one of three messages:

- "This election does not support ballot updates. All ballots are final once submitted" — the setting is off.
- "You can update your ballot using the link in your email receipt" — the setting is on and the election is open.
- "The election has closed. All ballots are final" — the setting is on but voting has ended.

## Should you turn it on?

This feature involves a real trade-off between two things elections normally try to protect: the finality of a secret ballot, and the voter's freedom to express their genuine current preference. Which matters more depends on your election.

### The case for

- **Long voting windows.** Online elections often stay open for days or weeks. Circumstances change — a candidate withdraws, new information comes out, a voter simply reconsiders. Vote updating lets the ballot reflect the voter's preference at the close of the election, not at whatever moment they happened to click submit.
- **Honest mistakes.** Scoring or ranking many candidates invites misclicks. Without updating, a voter who notices a mistake on their receipt has no recourse; with it, they fix it themselves instead of emailing you.
- **It can protect against pressure.** This is the surprising one. Estonia's national internet voting system deliberately allows re-voting as a safeguard for voting freedom: a voter can [change their i-vote as many times as they wish, and only the last vote counts](https://www.valimised.ee/en/internet-voting/more-about-i-voting/introduction-i-voting). The reasoning is that someone pressured to vote a certain way can comply, then quietly vote again later — the coercer can never know the voter's final choice, so the pressure cannot be made to stick. The same mechanism your instincts may flag as a risk is used at national scale, on purpose, as a coercion countermeasure.

### The case against

- **The link back to the ballot cuts both ways.** Updating a vote requires a lasting connection between a voter and their ballot, and that connection can also *prove* how someone voted. The secret ballot exists precisely to make that proof impossible: if a voter can demonstrate their vote, a coercer or vote-buyer can demand the demonstration — and demand that the vote not be changed afterward.
- **The protection is only as good as the deadline.** The Estonian logic works because no one can verify the *last* vote before voting closes. A determined coercer who controls the voter's access in the final moments of the election — or simply demands proof after the close — undercuts it. Re-voting weakens coercion; it does not eliminate it.

In short: for a low-conflict election with a long voting window, updating mostly fixes mistakes and keeps ballots current. For an election where you expect pressure, vote-buying, or factional conflict, think carefully about which side of this trade-off your threat model lands on — and note that "off" is not automatically the safe answer, as Estonia's design shows.

## Three cautions

These three points are not trade-offs — they hold regardless of how you weigh the section above.

{: .warning }
> **Do not combine vote updating with preliminary results.** Voters who can see the running tally *and* change their vote will do both, and the election starts measuring reactions to the tally instead of independent preferences. Each setting is defensible on its own; together they invite coordinated vote-switching. See [Preliminary Results](preliminary_results.md) for a fuller discussion of this combination.

{: .warning }
> **With updating on, the receipt link is a live credential.** When ballots are final, an emailed receipt is just a record. When updating is enabled, the link in that email can change the voter's ballot for as long as the election is open — anyone with access to the inbox can use it. Tell your voters to treat the receipt email like a password: don't forward it, don't share it, and secure the account it was sent to.

{: .important }
> **Testing in draft mode does not test this feature.** Draft-mode test votes bypass the voter roll, so voting twice as a test creates two separate test ballots rather than updating one. If you "checked that updating works" in draft, you have not actually exercised it. To verify the real behavior, include your own email in the voter roll and update your own ballot after the election opens.

## Related

- [Security Options](security_options.md) — election types and voter authentication; vote updating requires the email-list flow.
- [Preliminary Results](preliminary_results.md) — what live tallies reveal, and why they combine badly with editable ballots.
- [FAQ](faq.md) — answers to other common questions.
- For more questions, reach out to our team at elections@equal.vote.
