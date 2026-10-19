---
layout: default
title: Voter Groups
nav_order: 3
parent: Reference
grand_parent: Running an Election
---

# Voter Groups

Voter groups let you split your voters into named groups — wards, departments, or any other division — and choose which races each group sees. Each voter only sees the races open to their group.

This feature is behind the **beta features flag**. See [How to enable beta features](how_to_enable_beta_features.md) to turn it on.

## Turning on Set Voter Groups

Once the beta flag is on, go to your election's **Settings** page and switch on **Set Voter Groups**. You can turn it back off at any time without losing your group list or your race assignments.

## Managing the group list

Click **Edit groups** (or **Add groups** when the list is empty) to open the group manager. From there you can:

- **Add a group** by typing its name and clicking Add. Names are trimmed of surrounding spaces, and names that differ only in letter case ("ward 1" and "Ward 1") count as duplicates.
- **Delete a group** that has no voters assigned to it. Delete is disabled for groups that still have voters; move those voters first.

The group list is **read-only once the election is finalized**. Plan your groups before you finalize.

## The race × group grid

Below the group manager, a grid shows every race (in ballot order) across the rows and every group across the columns. Check a box to let that group see that race.

- **Races that existed before you turned groups on** start with every box ticked, so nothing is hidden by accident.
- **A newly added group** starts ticked for every race.
- A **No group** column appears whenever at least one voter has no group assigned, so you can choose what those voters see.

A short line above the grid reads: *"Check the boxes to choose which races each group can see."*

## Warnings

The grid highlights problems so you can catch them before voters arrive. Warnings inform — they don't block finalization.

- **A race no group can see** — the row is shaded and a warning reads *No voter group can see "Race Title". Check at least one group for this race.*
- **A group that sees no races** — the column is shaded and a warning reads *Voters in "Group Name" would see no races. Check at least one race for this group.* For the No group column, the message reads *Voters with no group would see no races. Check at least one race for No group.*

Warnings appear only on the Settings page.

## Adding voters with a group

When voter groups are on, include a `voter_group` column in your voter CSV. The accepted column headers are exactly `voter_id`, `email`, and `voter_group` (in that order when all three are checked).

| Rule | Detail |
|---|---|
| Blank `voter_group` cell | The voter gets No group — no warning or error |
| Letter case | `ward 1` matches `Ward 1` on your list and is stored as `Ward 1` |
| Group not on your list | The confirmation dialog shows the new groups before you commit |
| After finalization | An upload with groups not already on your list is rejected with an error |

### New groups in an upload

When an upload contains group names that aren't on your list yet, the confirmation dialog lists them — for example:

> *This adds voter groups "Ward 7" (41 voters) and "Wrd 2" (1 voter) to your existing voter groups "Ward 1", "Ward 2" and "Ward 3".*

Check the names carefully: a typo like "Wrd 2" becomes a new group. Click **Proceed** to add the groups and the voters together, or **Cancel** to upload nothing.

## What voters see

Each voter sees only the races open to their group. On the ballot-submitted page, voters with a group see a *Voter Group:* line confirming which group they voted in. Voters with no group see no group line.
