# BetterVoting

BetterVoting is an online election and polling platform built by the Equal Vote Coalition, supporting multiple voting methods (STAR, IRV, Approval, Ranked Robin, and others).

## Language

**Support Actions**:
The canonical trio of ways a visitor can support the project — Volunteer, Donate, Merch — surfaced together in both the nav's "Support Us" dropdown and the landing page's support stripe. `/volunteer` redirects to the codebase contribution guide, so Volunteer already covers code/docs contribution — it isn't a separate action.
_Avoid_: Contribute (same destination as Volunteer, not a distinct Support Action)

**Submission Channel**:
The mechanism by which a ballot enters an election. Three channels are defined: **Online (browser)** (`submitted_via_browser`) — a voter submits directly through the web UI; **Paper ballots (admin upload)** (`submitted_via_admin`) — an election owner or system admin bulk-uploads ballots collected on paper; **Discord** (`submitted_via_discord`) — future, behind a feature flag, not yet implemented. An election's allowed channels are configured via the `allowed_submit_types` field on `ElectionSettings`. This is a per-election policy decision, locked once the election leaves draft.
_Distinct from Ballot Source_ (see below).

**Paper Ballots**:
Ballots that were collected on paper (or in any out-of-band medium) and then uploaded into BetterVoting by an election owner or system admin via the Upload Ballots feature. They are stored alongside online ballots in the same table and are identified by their ballot-history action type (`submitted_via_admin`), not by a separate field.
_Avoid_: "admin ballots" (implies the admin voted, not that the admin uploaded someone else's vote).

**Ballot Source** (existing concept, distinct from Submission Channel):
Refers to the origin election when a ballot is carried over from a prior election (e.g. `prior_election` sourced ballots used to seed a new election with historical data). Ballot Source governs ballot provenance across elections; Submission Channel governs how a ballot entered a single election. The two concepts are orthogonal — an admin-uploaded ballot is always `submitted_via_admin` regardless of its source election.
