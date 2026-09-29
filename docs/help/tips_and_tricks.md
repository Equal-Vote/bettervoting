---
layout: default
title: Tips and Tricks
nav_order: 9
parent: BetterVoting Documentation
---

{:toc}

# Tips and Tricks

Small things that make an election easier to read, easier to trust, and easier to share. None of these are required — they're the details that are easy to miss on your first election.

## Put links in your description, not just a URL

The **election description** and each **race description** are formatted, so you can add a real, clickable link:

```
Read the full proposal at [our website](https://example.org/proposal).
```

A bare URL is **not** turned into a link. If you write this:

```
Read the full proposal at https://example.org/proposal
```

voters see the address as plain text and have to select and copy it by hand. On a phone that is a real obstacle, and it is the single most common way a description ends up less useful than it should be.

The same formatting also gives you:

| What you type | What voters see |
|---|---|
| `[click here](https://example.org)` | a link, opening in a new tab |
| `**important**` | **important** |
| a blank line between two paragraphs | two paragraphs |

Links open in a new tab, so clicking one never takes a voter away from a ballot they're partway through filling in.

## Know where each description actually appears

The two description fields show up in different places, which is worth knowing before you decide what to write where:

| Field | Where voters see it |
|---|---|
| **Election description** | the election's home page, the card on **Browse Polls**, and email invitations |
| **Race description** | on the ballot, under that race's title |

{: .note }
> Neither description appears on the **results** page. If you want people reading the results to find your background material — a proposal, a rules document, an explanation of how the count works — link to it from somewhere that survives the election, and share that link alongside the results link.

## Titles are plain text

Election titles and race titles are shown exactly as typed. Formatting and links don't work there, so `[my org](https://example.org)` in a title will display as those literal characters, brackets and all. Keep titles short and descriptive, and put anything else in the description.

## Give candidates their own link

Candidates have a dedicated **link** field — you don't need to put candidate URLs in the description. When it's set, the candidate's name on the ballot becomes a link to that page, with a small "opens in a new tab" icon beside it. It's the tidiest way to let voters research a choice without leaving the ballot, and it keeps your description short.

There's a separate field for a party affiliation link, which behaves the same way.

## Say what happens in a tie, before you start

Ties are rare in STAR Voting, but they're much easier to handle if the rule was agreed in advance rather than argued afterwards. See [Ties](ties.html) for the protocol BetterVoting uses and the reasoning behind it.

## Test with a draft first

Send yourself the ballot link and vote on it before you invite anyone. It takes a minute and it catches the things that are awkward to fix later: a candidate name that's ambiguous on a small screen, a race description that's too long to read on a phone, a link that points at the wrong page.

---

*Something here out of date, or a tip you think belongs on this page? Corrections are welcome — see the [contribution guide](../contributions/0_contribution_guide.html).*
