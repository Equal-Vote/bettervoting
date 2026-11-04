---
layout: default
title: Uploading Paper Ballots
nav_order: 6
parent: Setting Up Your Election
grand_parent: Running an Election
---

# Uploading Paper Ballots

If some of your voters vote on paper (or through another system), you can upload their ballots as a CSV file so BetterVoting counts them together with the ballots cast online. For planning a paper election in general, see [Paper Ballots](paper_ballots.md).

## Before the election opens

Uploads have to be switched on while the election is still a draft: on the **Settings** page, turn on **Accept Uploaded Paper Ballots**. Once the election is open, an **Upload Ballots** page appears in the admin sidebar. Ballots can be uploaded while the election is open.

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

The ballot file has the same layout as the CSV you can download from the results page (see [Exporting Your Data](exporting_your_data.md)), so the **Download ballot file template** button on the upload page gives you the right headers.

| Column | Meaning |
|---|---|
| `ballot_id` | Your id for the paper ballot, for example the number printed on it. Required, up to 64 characters, and must not already be used in this election. |
| `precinct` | Optional. Only needed if your races are limited to certain precincts. |
| One column per candidate | The mark for that candidate: the score for STAR, 1 or 0 for Approval, the rank for ranked methods. Leave the cell blank if the candidate was not marked. |

With a single race, each candidate column is headed by the candidate's name. With more than one race, headers are `Race Title!!Candidate Name`.

```
ballot_id,precinct,Alice,Bob,Carol
P-0001,,5,0,3
```

## The voter file

Only for elections with a voter list. A single column, headed `voter_id` or `email`, listing the voters who cast the ballots in the ballot file.

```
voter_id
AliceID
```

If BetterVoting sends the invitations for your election, voter IDs are hidden from you, so use the `email` column.

## What gets checked

Every upload is all or nothing: if anything is wrong, no ballots are added and no voters are marked, and the error says which rows to fix. An upload is refused if:

- a `ballot_id` is blank, repeated in the file, or already used in this election
- a mark is not a whole number, or not allowed by the race's voting method
- the ballot file is missing a candidate column, or has a column that isn't a candidate
- (voter list elections) the voter file is missing, has a different number of rows than the ballot file, repeats a voter, lists someone who isn't on the voter list or isn't approved, or lists someone who has already voted
- the election isn't open, or uploads weren't turned on for it

Elections that let voters edit their vote can't take uploads when they have a voter list, because an uploaded voter has no ballot of their own to edit.

## Keeping ballots secret

The upload never connects a voter to a ballot, but your own paperwork might. If voters keep a stub with their ballot id on it, anyone who sees that stub can look up the ballot in the published ballot data. Keep the id on the part of the ballot you collect, or keep any id-to-voter record away from the ballots.
