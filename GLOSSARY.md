# BetterVoting

BetterVoting is an online election and polling platform built by the Equal Vote Coalition, supporting multiple voting methods (STAR, IRV, Approval, Ranked Robin, and others).

## Language

**Support Actions**:
The canonical trio of ways a visitor can support the project — Volunteer, Donate, Merch — surfaced together in both the nav's "Support Us" dropdown and the landing page's support stripe. `/volunteer` redirects to the codebase contribution guide, so Volunteer already covers code/docs contribution — it isn't a separate action.
_Avoid_: Contribute (same destination as Volunteer, not a distinct Support Action)

**Voter Roll**:
The list of voters an election admin has registered for an election. Each entry is identified by a voter ID, an email, or both. The admin UI calls it the "voter list" and the code calls its entries "election roll" rows; they are the same thing.
_Avoid_: Electorate, voter database

**Roll Conflict**:
An entry being added to a Voter Roll that matches an existing entry, or another entry in the same upload, by voter ID or by email. Emails match regardless of letter case. Conflicting entries are never added twice and never overwrite the existing entry; the admin is told about them and confirms before the rest are added.
_Avoid_: Duplicate (too loose about which entry wins), collision
