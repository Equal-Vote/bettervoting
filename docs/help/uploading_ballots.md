---
layout: default
title: Uploading Paper Ballots
nav_order: 6
parent: Setting Up Your Election
grand_parent: Running an Election
---

# Uploading Paper Ballots

If some of your voters vote on paper (or through another system), you can upload their ballots as a CSV file so BetterVoting counts them together with the ballots cast online. For planning a paper election in general, see [Paper Ballots](paper_ballots.md).

## Turning uploads on

Uploads are chosen while the election is still a draft. On the **Manage Voters** page, answer **How will votes be cast?** with one of these:

| Choice | What it means |
|---|---|
| Online only | The usual: voters vote on the election page, and nothing is uploaded. |
| Online and uploaded paper ballots | Voters can vote online, and you can also upload paper ballots. |
| Uploaded paper ballots only | Nobody can vote on the election page. Every ballot comes from your uploads. |

With either upload choice, an **Upload Ballots** page appears in the admin sidebar. The choice can't be changed once the election is finalized.

Without online voting, some voter options no longer apply:

- With no voter list, there's no "limit to one vote per..." to set, because only the ballots you upload are counted.
- With a voter list, the voter IDs must be ones you manage. You write the voter file yourself, so you need to know them, and BetterVoting-managed IDs (an email list) can't be used.

Uploads can't be combined with **Allow Voters To Edit Vote** (under Settings): while one is on, the other can't be switched on. An uploaded ballot has no voter behind it to edit it.

## Trying it out in a draft

While the election is a draft you can upload test ballots to check your files and see them in the preview results. Test ballots are deleted when you finalize the election, just like test votes cast online. In an election with a voter list, the voter file is checked against the list, but nobody is marked as having voted.

Ballots that count are uploaded once the election is open.

## Which files you upload

What you upload depends on whether BetterVoting holds your voter list.

| Your election's voter setting | What you upload |
|---|---|
| Anyone can vote (open access, with or without a sign-in, browser, or IP check) | **One file**: the ballots |
| Only voters on your voter list (voter IDs, or emails BetterVoting invites) | **Two files at once**: the ballots, and the voters who cast them |

### Elections without a voter list: one file

BetterVoting has no list of who may vote, so it can't record who voted on paper. Upload just the ballots, and keep track of who voted outside BetterVoting.

### Elections with a voter list: two files

Upload the ballots and, alongside them, a separate list of the voters who cast those ballots. BetterVoting adds the ballots and marks each listed voter as having voted, so they can't also vote online and won't get reminder emails.

The two files are **never linked**. The rows don't need to be in the same order, and BetterVoting does not record which voter cast which ballot, so the secret ballot is kept. The files must have the same number of rows: one voter per ballot.

## The ballot file

The ballot file has the same layout as the CSV you can download from the results page (see [Exporting Your Data](exporting_your_data.md)), so the **Download ballot file template** button on the upload page gives you the right headers. The upload page also shows a table of what goes in each column for your election, with an example row.

| Column | Meaning |
|---|---|
| `ballot_id` | Your id for the paper ballot, for example the number printed on it. Required, up to 64 characters, and must not already be used in this election. |
| `precinct` | Optional. Only needed if your races are limited to certain precincts. |
| One column per candidate | The mark for that candidate (see below). Leave the cell blank if the candidate was not marked. |
| Write-in pairs | Only for races that take write-ins (see below). |

With a single race, each candidate column is headed by the candidate's name (or `Race Title!!Candidate Name`, which also works). With more than one race, headers are `Race Title!!Candidate Name`.

```
ballot_id,precinct,Alice,Bob,Carol
P-0001,,5,0,3
```

### Marks

| Voting method | In each candidate's column | A blank cell means |
|---|---|---|
| STAR, STAR PR | a score from 0 to 5 | not scored |
| Approval | 1 to approve | not approved (0 also means not approved) |
| Choose one | 1 for the one chosen candidate; mark at most one | not chosen |
| Ranked (RCV, STV, Ranked Robin) | a rank: 1 for first choice, 2 for second, and so on, up to the election's rank limit | not ranked |

A choose-one race with more than one candidate marked is refused. Leave the race blank for a spoiled ballot.

### Write-ins

A race that takes write-ins has pairs of columns after its candidates: `write_in_1` for the written-in name and `write_in_1_mark` for its mark, then `write_in_2` and `write_in_2_mark`, and so on (with the `Race Title!!` prefix when there is more than one race). The mark follows the same rule as the candidates. Leave both blank if nobody was written in. The template has two pairs per race; add more columns if a ballot has more write-ins, up to 10.

```
ballot_id,precinct,Measure!!Yes,Measure!!No,Measure!!write_in_1,Measure!!write_in_1_mark
P-0001,,1,,Pat Writein,1
```

Written-in names show up for review with the write-ins cast online.

### Files from older templates

The layout only ever gains columns, so a template or export you saved earlier keeps uploading as long as the election's races and candidates haven't changed.

## The voter file

Only for elections with a voter list. A single column, headed `voter_id` or `email`, listing the voters who cast the ballots in the ballot file.

```
voter_id
AliceID
```

If BetterVoting sends the invitations for your election, voter IDs are hidden from you, so use the `email` column.

## What gets checked

Every upload is all or nothing: if anything is wrong, no ballots are added and no voters are marked. Problems with the file show up as soon as you select it, in a table giving the spreadsheet row, the ballot id, the column and what's wrong, so you can fix them all in one go. An upload is refused if:

- a `ballot_id` is blank, repeated in the file, or already used in this election
- a mark is not a whole number, or not allowed by the race's voting method
- a write-in has a name but no mark, or a mark but no name
- the ballot file is missing a candidate column, or has a column that isn't a candidate
- (voter list elections) the voter file is missing, has a different number of rows than the ballot file, repeats a voter, lists someone who isn't on the voter list or isn't approved, or lists someone who has already voted
- the election is closed, or it doesn't take uploaded ballots

Before anything is uploaded, the page asks you to confirm. Once the election is open, an upload can only be undone by deleting all uploaded ballots.

## Fixing a mistake

If an upload went wrong, use **Delete all uploaded ballots** at the bottom of the upload page, then upload corrected files. You confirm by typing *delete all uploaded ballots*.

- Every uploaded ballot is withdrawn. Ballots cast online are kept.
- Voters the uploads marked as having voted go back to not having voted, so the same voter file can be uploaded again.
- The same ballot ids can be used again.
- Nothing is erased: the withdrawn ballots are kept in the election's records, and once the election is finalized the deletion appears in its public audit log, like uploads do.

## Keeping ballots secret

The upload never connects a voter to a ballot, but your own paperwork might. If voters keep a stub with their ballot id on it, anyone who sees that stub can look up the ballot in the published ballot data. Keep the id on the part of the ballot you collect, or keep any id-to-voter record away from the ballots.
