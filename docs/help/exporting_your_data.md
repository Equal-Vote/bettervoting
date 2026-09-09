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

## Who can download, and when

Ballot data follows the visibility of your results:

| Situation | Who can download |
|---|---|
| Results are public (the **Show Preliminary Results** / **Make Results Public** setting is on) | Anyone with the election link — no sign-in needed |
| Results not public, election **closed** | The election's owner, admins, and auditors |
| Results not public, election still open | No one — ballot data is locked until the election closes |

## The CSV export

The CSV is a cast vote record: **one row per ballot**, one column per candidate. The first columns identify the ballot; the rest hold that voter's marks.

| Column | Meaning |
|---|---|
| `ballot_id` | The ballot's unique ID — the same ID shown to the voter on their confirmation screen and email receipt |
| `precinct` | The voter's precinct, if the voter roll assigned one; blank otherwise |
| One column per candidate | The voter's mark for that candidate (see below) |

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

Each row carries a `ballot_id`, and each voter is sent their own ballot ID in their email receipt after voting (and in the email receipt, if enabled). That gives every voter a receipt-check: find your ID in the published file and confirm your ballot is recorded exactly as you cast it — while nobody else can tell which row is yours.
