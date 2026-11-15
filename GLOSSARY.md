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

**Voter Group**:
A named subset of a Voter Roll. Each voter entry belongs to at most one Voter Group. A race can be limited to one or more Voter Groups, and a voter only sees the races open to their group. A race that isn't limited is open to every voter; a race limited to an empty set of groups is open to no one, which the admin is warned about. An election's list of Voter Groups is fixed once the election is finalized. The code calls this a "precinct".
_Avoid_: Precinct (implies geography, which polls and organisations don't have), cluster, cohort

**Entitlement**:
A paid-for (or granted) increase to something an election is allowed, such as its voter limit. An election's total for a kind of entitlement is its free-tier default plus every entitlement it has been given.
_Avoid_: Credit, upgrade

**Line Item**:
One line of a purchase: a kind of entitlement, a quantity, and the Unit Price and Unit Entitlement that each unit of that quantity carries. A line's totals are always its unit values times its quantity.
_Avoid_: Cart item, order line

**Unit Price**:
What one unit of a Line Item costs, in cents. On a Line Item, and anywhere a purchase meets Stripe, "amount" means money in cents and never a count of voters or other entitlement.
_Avoid_: Unit cents, price per block

**Unit Entitlement**:
How much entitlement one unit of a Line Item grants, e.g. 200 voters per Voter Block.
_Avoid_: Entitlement amount (reads as money)

**Voter Block**:
The unit a voter-limit increase is bought in: a fixed number of voters (currently 200) at a fixed Unit Price. A purchase's quantity counts Voter Blocks, never voters.
_Avoid_: Additional voters (names the effect, not the unit), voter pack
