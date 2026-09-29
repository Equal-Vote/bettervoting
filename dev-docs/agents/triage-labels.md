# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | --------------------- | ----------------------------------------- |
| `needs-triage`              | — (not used)          | Maintainer needs to evaluate this issue  |
| `needs-info`                | — (not used)          | Waiting on reporter for more information |
| `ready-for-agent`           | `sandcastle`           | Fully specified, ready for an AFK agent  |
| `ready-for-human`           | — (not used)          | Requires human implementation            |
| `wontfix`                   | — (not used)          | Will not be actioned                     |

Only `ready-for-agent` is tracked in this repo, via the `sandcastle` label. Skills should not attempt to apply or query the other four roles as labels.
