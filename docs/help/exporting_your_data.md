---
layout: default
title: Exporting Your Data
nav_order: 12
parent: BetterVoting Documentation
---

# Exporting Your Data

Every BetterVoting election can be downloaded as a complete, anonymized record of every ballot cast — a *cast vote record*. You can open it in a spreadsheet, archive it, or hand it to an independent auditor who can re-count the election from scratch and confirm the published result.

This page covers getting the data **out**: where the download lives, what the files contain, what each column means, what is deliberately left out, and what you can legitimately do with the file afterwards. For what the on-screen results charts mean, see the results documentation.

## Where to find the download

The download lives on the election's **results page** (`bettervoting.com/<election id>/results`). Below the results you'll find a **Download** button with two options:

- **Download CSV** — a spreadsheet-friendly table, one row per ballot.
- **Download JSON** — a complete machine-readable archive: the election setup, every ballot, and the tabulated results in one file.

The button first loads the ballots, then offers both formats. Files are named `Ballot Data - <election title>-<election id>` with a `.csv` or `.json` extension.

## Who can download, and when

Ballot data follows the visibility of your results:

| Situation | Who can download |
|---|---|
| Results are public (the **Show Preliminary Results** / **Make Results Public** setting is on) | Anyone with the election link — no sign-in needed |
| Results not public, election **closed** | The election's owner, admins, and auditors |
| Results not public, election still open | No one — ballot data is locked until the election closes |

The download button appears once results are public. The usual flow for a private election is: close the election, review, then make the results public — the download appears alongside them. Owners, admins, and users granted the **auditor** role can retrieve ballot data for a closed election even before the results are published.

{: .note }
> Ballot data is never available to the public while an election is open with hidden results. This prevents anyone from watching the running tally of an election that hasn't chosen to show one. See [Preliminary Results](preliminary_results.md) for what making results public during voting does and doesn't reveal.

## The CSV export

The CSV is a cast vote record: **one row per ballot**, one column per candidate. The first columns identify the ballot; the rest hold that voter's marks.

| Column | Meaning |
|---|---|
| `ballot_id` | The ballot's unique ID — the same ID shown to the voter on their confirmation screen and email receipt |
| `precinct` | The voter's precinct, if the voter roll assigned one; blank otherwise |
| One column per candidate | The voter's mark for that candidate (see below) |
| `overvote_rank` | Ranked Choice (RCV) and STV races only — the first rank position at which the ballot marked more candidates than allowed, or blank if it never did |
| `has_duplicate_rank` | Ranked Choice and STV races only — `TRUE` if the ballot gave the same rank to more than one candidate, else `FALSE` |

The two extra ranked-ballot columns mostly matter for elections imported from real-world paper cast vote records; they let an auditor reproduce exactly when each ballot exhausts.

**What the number in a candidate column means depends on the voting method:**

| Voting method | Value in the column |
|---|---|
| STAR, STAR-PR | The score, 0–5 |
| Approval | 1 = approved, 0 = not approved |
| Ranked Choice (RCV), STV, Ranked Robin | The rank: 1 = first choice, 2 = second choice, … |
| Choose One | 1 = the chosen candidate |

**A blank cell is not a zero.** Blank means the voter left that candidate unmarked; an explicit 0 means the voter actively gave a zero. Most methods count both the same way, but the distinction is preserved in the file so audits and turnout analyses don't lose it.

### Elections with more than one race

All races share the same file, still one row per ballot. With a single race, each column header is just the candidate's name. With multiple races, headers become `Race Title!!Candidate Name` so that same-named candidates in different races stay distinct. A voter who skipped a race entirely simply has blank cells across that race's columns.

## The JSON export

The JSON download is the fuller archive. It contains three top-level sections:

- **Election** — the complete election setup: title, dates, settings, every race with its voting method, number of winners, and candidate list. This is what lets a re-count know the rules, not just the marks.
- **Ballots** — every ballot, in the same anonymized form as the CSV: ballot ID, precinct, and each race's per-candidate marks. A `null` score means the voter left that candidate unmarked.
- **Results** — the tabulated results as they stood at the moment you downloaded, including round-by-round detail. If a tie was broken, the results record the full tie-break order that was used, so even a tie-broken outcome can be reproduced exactly from the file. See [Ties](ties.md) for how BetterVoting breaks ties.

If you only want to eyeball ballots in a spreadsheet, use the CSV. If you want to archive the election or re-tabulate it with software, use the JSON — it is self-contained.

## What is deliberately NOT in the file

The export is anonymized by design. It never contains:

- **Who voted** — no names, email addresses, or voter IDs.
- **When each ballot was submitted** — no timestamps of any kind.
- **The order ballots were cast in.** Ballots are returned in a freshly randomized order on every download; two downloads of the same election will list the same ballots in different orders.
- **Edit history** — if a voter updated their ballot, only the final version appears, with no trace of what changed or when.

The reason: election admins can see which voters have voted and when. If the ballot file carried timestamps or preserved submission order, those two lists could be lined up against each other to work out how individual people voted. Stripping time and order from the export keeps the ballots and the voter list unlinkable — see [Security Options](security_options.md) for the other half of that promise.

Only **submitted** ballots are included. Partially saved, uncast ballots are not part of the record.

## Voters can find their own ballot

Each row carries a `ballot_id`, and each voter is shown their own ballot ID on the confirmation screen after voting (and in the email receipt, if enabled). That gives every voter a receipt-check: find your ID in the published file and confirm your ballot is recorded exactly as you cast it — while nobody else can tell which row is yours.

## Auditing: re-count the election yourself

This is the export's real purpose. Because the file is a complete cast vote record plus the rules of the election, **anyone with the file can re-run the count independently** and check that it produces the published winners:

- **By hand.** For a modest number of ballots, a STAR election tallies with pencil and paper — see [Hand Count](hand_count.md) for the full procedure. The CSV, sorted and summed in a spreadsheet, is even quicker.
- **By spreadsheet.** STAR's scoring round is a column sum; the runoff is a count of which finalist each row scored higher. Approval is a single sum per column.
- **By software.** The JSON feeds any independent tabulator that implements the election's method. Because it includes the settings and the tie-break order, a correct implementation reproduces the result exactly — not just the winner, but the path to it.

If your re-count matches the published results, you have verified the outcome without having to trust BetterVoting's own tabulation. If it doesn't match, you have something concrete to raise: a specific file, a specific rule, and a specific disagreement.

{: .note }
> Publishing the ballot file alongside your results is the strongest transparency step an election admin can take. Anyone — a losing candidate, a journalist, a curious voter — can check the count without needing any access you didn't already give them.
