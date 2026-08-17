---
layout: default
title: Glossary
nav_order: 17
parent: BetterVoting Documentation
---

# Glossary

Definitions for the terms you'll meet in BetterVoting — on ballots, on results pages, in the admin panel, and in the emails it sends. Each entry starts with the plain answer; notes for election administrators follow where they matter.

## Admin

A person the election owner has given management access to. Admins can edit the election while it's in draft, add voters to the voter roll, approve or invalidate voter entries, view preliminary results, send email blasts, and approve write-in candidates. Admins cannot delete the election, change who has which role, or finalize/open/close the election — those belong to the [owner](#owner).

## Approval Voting

A voting method where you mark every candidate you approve of — as many or as few as you like. The candidate approved by the most voters wins.

## Archived

The final election state. Archiving prevents any future changes and hides the election from your elections page. An admin can archive an election from any state, and it cannot be undone. Voters cannot cast ballots in an archived election.

## Auditor

A role with read-and-verify access. Auditors can view the election, the voter roll, the anonymized ballots, and preliminary results, and can flag entries that look wrong — but they cannot change the election or the votes. The role exists so someone outside the admin team can independently check an election.

## Automatic Runoff

The second round of STAR Voting. The two highest-scoring candidates from the [Scoring Round](#scoring-round) become finalists, and your full vote goes to whichever finalist you scored higher — no separate runoff election needed. The finalist preferred by more voters wins.

## Ballot

The set of choices one voter submits — your scores, ranks, approvals, or selection, across every race in the election. In an election set up as a poll, the on-screen word is **response**. After submitting you'll see a confirmation page with a [Ballot ID](#ballot-id).

## Ballot ID

The identifier shown on your confirmation page (and in your email receipt, for email-list elections) after you submit your ballot. It lets you return to view your ballot, and — if the election allows ballot updates — change it while voting is open.

## Basic Multi-Winner

One of the two ways to elect multiple winners (the other is [Proportional Multi-Winner](#proportional-multi-winner)). Basic (also called *bloc*) elects the first winner exactly as a single-winner election would, then repeats the process until all seats are filled. It favors candidates with the broadest overall support, so a cohesive majority can win every seat.

## Candidate

A person or option you can vote for in a race. In an election set up as a poll, the on-screen word is **choice**. Admins: candidates can't share a name within a race, and a race normally needs at least two of them (unless write-ins are enabled).

## Cast vote record

The full, anonymized list of every ballot cast, showing how each ballot voted without showing who cast it. Useful for independent verification, [hand counting](hand_count.md), or running the ballots through another tool.

## Choose One

BetterVoting's name for plurality voting (shown in full as **Choose One Plurality**): you mark exactly one candidate, and the candidate with the most votes wins. Not recommended for races with more than two candidates, because similar candidates split their supporters' votes.

## Closed

The election state after voting ends. No more ballots can be cast, and results become final. Elections with an end time close automatically when it passes; elections without one stay open until an admin closes them manually.

## Condorcet

A way of judging elections by head-to-head matchups: a Condorcet winner is the candidate who would beat every other candidate one-on-one. On BetterVoting, [Ranked Robin](#ranked-robin) elects this way, and the **Head-to-Head Matchups** panel under Stats for Nerds shows the same matchup grid for other methods.

## Credentialer

A role for the person who verifies voters. Credentialers can view the voter roll, flag entries, and approve voters, but cannot edit the election or see results controls. Useful when the person checking membership rolls shouldn't also have admin power over the election.

## Draft

The state an election starts in — and the only state in which it can be edited. While in draft, anyone with the link can try the ballot, but every ballot cast is a **test vote**, and all test votes are deleted when the election is finalized. Admins: a draft election skips voter authentication, so a draft test does not confirm your voter-list or one-vote-per-person settings.

## Election vs. Poll

A vocabulary setting, not a functional one. Choosing "poll" swaps the words shown on screen and in emails — candidate becomes *choice*, race becomes *question*, ballot and vote become *response* — but voting and counting work identically either way.

## Email list

One of the two kinds of restricted voter list (see also [ID list](#id-list)). You provide voter email addresses; when the election opens, BetterVoting emails each voter a unique private voting link, and sends a receipt after they vote. The recommended option for high-security elections — see [Security Options](security_options.md).

## Equal Support

In a STAR runoff, a ballot that scored both finalists the same shows **equal support** — it expresses no preference between them, so it isn't added to either finalist's runoff total. These ballots still counted fully in the Scoring Round; the results page reports how many voters expressed no preference between the finalists. Sometimes also called *equal preference* or *no preference*.

## Exhausted

In Ranked Choice Voting and STV, a ballot becomes exhausted when it can no longer count for anyone — every candidate the voter ranked has been eliminated, or a ballot error (like too many skipped or duplicate ranks) stopped it from transferring. Exhausted ballots appear as their own row in the tabulation rounds table.

## Finalized

The state between draft and open. Finalizing locks the election — it can no longer be edited — deletes all test votes, and (for email-list elections) queues the voter invitations. Finalizing is one-way: there is no return to draft. If no start time is set, the election opens immediately.

## ID list

One of the two kinds of restricted voter list (see also [Email list](#email-list)). You create the voter IDs yourself, distribute them to voters however you like, and voters enter their ID on the voting page to cast their ballot. More flexible than the email list when you don't have everyone's email address.

## None of the Above

An option an admin can add to a race, guaranteed to be listed at the bottom of the ballot. It functions like any other candidate — voters can score, rank, or approve it — which lets voters register that they support no one.

## Official results

The results shown once an election is closed, marked **OFFICIAL RESULTS** on the results page. Compare [Preliminary results](#preliminary-results).

## Open

The state in which real voting happens. Voters can cast ballots; the election can no longer be edited. Elections with scheduled start/end times open and close on the clock; without them, the admin opens and closes the election manually (the two approaches can't be mixed).

## Owner

The account that created (or claimed) the election. The owner can do everything an [admin](#admin) can, plus: assign roles, delete the election, change its state (finalize, open, close, archive), edit the voter roll, and invalidate individual ballots.

## Preliminary results

The live running tally, marked **PRELIMINARY RESULTS**, visible while voting is still open when the admin enables **Show Preliminary Results**. Numbers can change with every new ballot. Admins: showing a live tally has real privacy and strategy consequences — read [Preliminary Results](preliminary_results.md) before enabling it.

## Proportional Multi-Winner

One of the two ways to elect multiple winners (the other is [Basic Multi-Winner](#basic-multi-winner)). Proportional methods compute a win [quota](#quota) and ensure any faction with a quota's worth of support can win a seat, so the winner set reflects the electorate's makeup. On BetterVoting: Proportional STAR Voting and Single Transferable Vote.

## Proportional STAR Voting

The proportional multi-winner version of STAR Voting (short name **STAR PR**). Voters score candidates 0–5 exactly as in STAR; winners are then elected in rounds — each round elects the highest-scoring candidate, and the ballots that supported that winner are used up in proportion to the quota, so remaining seats go to other factions.

## Quota

In a proportional method, the amount of voting support that wins one seat. A candidate who reaches the quota is elected, and the ballots that elected them have that much of their weight spent, keeping each seat anchored to a distinct group of voters.

## Race

One contest within an election — its own title, candidates, voting method, and number of winners. An election can contain several races on one ballot. In an election set up as a poll, the on-screen word is **question**.

## Ranked Choice Voting

A voting method where you rank candidates in order of preference (short name **RCV**; the single-winner version is also known as Instant Runoff Voting). Ballots count for their highest-ranked active candidate; the last-place candidate is eliminated round by round, transferring those ballots to their next choice, until a candidate has a majority of the remaining active votes. Admins can limit the number of rankings and enable a drag-and-drop ballot.

## Ranked Robin

A voting method where you rank candidates and the winner is the candidate who wins the most head-to-head matchups against every other candidate — like a round-robin tournament (also known as a Condorcet method). The results page shows each candidate's wins and win rate.

## Restricted election

An election only people on the voter list can vote in — via an [Email list](#email-list) or an [ID list](#id-list). Unrestricted elections are open to anyone with the link, with per-device, per-network, per-account, or no voting limits; see [Security Options](security_options.md).

## Scoring Round

The first round of STAR Voting: all the stars from all the ballots are added up, and the two highest-scoring candidates become finalists for the [Automatic Runoff](#automatic-runoff). The top scorer usually — but not always — goes on to win the runoff; when they don't, it's because more voters preferred the other finalist.

## Single Transferable Vote

The proportional multi-winner version of Ranked Choice Voting (short name **STV**). You rank candidates; candidates who reach the quota are elected, their surplus votes transfer onward at reduced weight, and last-place candidates are eliminated, until all seats are filled.

## STAR Voting

Score Then Automatic Runoff. You score every candidate from 0 to 5 stars; the two highest-scoring candidates become finalists, and your full vote goes to the finalist you scored higher. See [Scoring Round](#scoring-round) and [Automatic Runoff](#automatic-runoff).

## Stats for Nerds

The expandable panel on the results page with deeper analysis: head-to-head matchups, average supporter profiles, how many scores or ranks voters used, name recognition, and voter error rates. Informational only — it doesn't affect who won.

## Test votes

Ballots cast while an election is in [draft](#draft). They behave like real ballots so you can try the full voting flow, but they are all deleted when the election is finalized.

## Tiebreaker

The procedure used when candidates end a round exactly tied. BetterVoting applies the Official Tiebreaker Protocol — prefer the candidate more voters scored higher, then the one with the most five-star ratings, then a random draw — and the results page shows which step decided it. The random draw uses a published candidate-shuffle so it can be verified afterwards. See [Ties](ties.md).

## Voter ID

The credential a voter in a restricted election uses to cast their ballot — either created by the admin ([ID list](#id-list)) or managed by BetterVoting behind a private emailed link ([Email list](#email-list)).

## Voter roll

The voter list for a restricted election: who may vote, whether they've voted, and their entry's status (registered, approved, flagged, or invalid). Admins use it to track turnout and send reminders; it shows *whether* each person voted, never *how*. Also called the voter list. Note: once the first voters are added, the voter-list settings are locked in for that election.

## Voting method

How a race is voted on and counted. BetterVoting supports STAR Voting, Proportional STAR Voting, Approval Voting, Ranked Robin, Ranked Choice Voting, Single Transferable Vote, and Choose One Plurality — each race in an election can use a different one.

## Write-in

A candidate a voter adds by name instead of picking from the printed list, in races where the admin has enabled write-ins. Write-in candidates start unapproved: an admin must review and approve them (merging misspellings, excluding ineligible entries) before their votes appear in results — until then the results page notes how many write-in scores were not counted. See the [FAQ](faq.md).
