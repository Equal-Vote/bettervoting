---
layout: default
title: Issue Lifecycle
nav_order: 4
parent: Contribution Guide
has_children: true
---

# Reporting Problems and Feedback

Users can quickly report problems using the "Feedback?" button in the bottom right of BetterVoting.com these will be sent to the Dev Leads as a ticket. After review this will be turned into a GitHub issue for further tracking.

Team members can create issues directly in GitHub using one of our issue templates. Templates help standardize our process and ensure that all relevant information is captured in every issue.

# Board Lanes

All issues end up in the board, and then progress as follows:

 * Discuss in Next Meeting
 * Ice Box
 * Emergent Requests
 * ERs ready for Issue
 * New Issue Approval
 * Prioritized Backlog
 * In Progress
 * Questions / In Review
 * Done

Our current board can be viewed at https://github.com/orgs/Equal-Vote/projects/3 (at time of writing this still need to be updated to reflect the new convention)

The following sections will detail each of these stages

# Emergent Requests

When items come up during a meeting or a pull request, then they can initially be created as Emergent Requests. ER give a quick way to file the request or problem, but they won't necessarily be actionable. ERs can be turned into issues later. 

To create an Emergent Request navigate to the [bettervoting](https://github.com/Equal-Vote/bettervoting/issues) issues tab, then click "New Issue" and select the emergent request template.

Dev Leads can add ERs to the "ERs ready for Issue" lane. There it's available for any member to proceed to create an issue from the ER.

# Creating a GitHub Issue

GitHub issues are created to document actionable tasks that a developer can take on. 

These can originate from a customer reported problem, but most are created by team members as needed.

To create an issue navigate to the [bettervoting](https://github.com/Equal-Vote/bettervoting/issues) issues tab, then click "New Issue" and select the blank issue template.

As you write the issue, make sure it passes the "New Team Member" test. A new team member should be able to take on this issue without needing further context. Issues passing the test should...

 * Have specific context about the work
 * Have clear requirements and/or checks
 * Have a definition of done
 * Be as small as it can reasonably be
 * The new person assigned to it can start making progress as soon as they have absorbed the context, in a week or less (preferable 1 work day)
 * Be properly labeled (see next section)

# Issue Labels

We use the following labels

Minimum Labels
 * **Complexity**: good-first issue, small, medium, large
 * **Role**: Backend, DevOps, Frontend, Design, Writing
 * **Project**: (use BetterVoting)

Complexity Series
 * **good first issue**: Issues that are reserved to our newest members. This should be your first and second official issue! Most issues of this complexity involves changing only one small line of code. We use this to see that your dev environment is setup properly and that you know how to branch correctly.
 * **Complexity: Small**: Our smallest general issue. This is only for small changes such as a bug fix, or a small feature.
 * **Complexity: Medium**: Our mid-complexity general issue. Medium issues usually involves about an hour to five hours of work, depending on experience. Issues here are straightforward but often involves multiple files.
 * **Complexity: Large**: Very free-form issues. Large issues demands a high time commitment, as well as vague requirements. Large issues will test your creativity and perseverance, and, most importantly, your ability to ask for help when needed.

Other Labels
 * **Ready For**: Dev Lead 
 * **Status**: To Update !, Updated, Help Wanted, 2 weeks inactive (To Update ! and 2 weeks inactive are automatic and should never be set manually)
 * **Missing**: Role, Complexity, Milestone
 * **Time Sensitive**: Attached to issues that should be sorted to the top of the prioritized backlog

(Heavily inspired by https://github.com/hackforla/website/wiki/How-to-read-and-interpret-labels)

# Milestone

Milestones will be added when reviewed issues are reviewed by the dev lead the numbers show it's priority order (example "30-Technical Debt")

They include a mix of shelf stable milestones ("10-Critical Bugs", "30-Technical debt", etc), and temporary feature milestones ("12-Feat. Editable Ballots", "15-Feat. Live Election Editing"). 

Milestones can be reordered by the project lead, and the numbering will reflect their relative importance. Generally shelf stable milestones will be multiples of 10. The shelf stable milestones are helpful to ensure that important issues outside of the feature milestones get prioritized correctly. 

Our current milestones can be viewed at https://github.com/Equal-Vote/bettervoting/milestones (at time of writing these still need to be updated to reflect the new convention)

# Triaging & Priotiziations

Once issue is made, they can be moved to the "New Issue Approval" lane, and a tag for "Ready for Dev Lead" can be added. Dev leads will check for issue quality, then set a milestone and add it to the prioritized backlog.

The prioritized backlog will primarily be sorted by milestone, with the exception of issues with the time sensitive label. Time sensitive gets sorted to the top regardless of the label

If an issue is marked with the "Outside Roadmap" milestone, then the issue is removed from kanban board (by removing the project label). These issues can be added back to the board later as new milestones are added.

# Assigning Issues

Any member can self-assign issues from the Priorizied Backlog. 

New members should aim to progress as follows with their first issues:
 - 2 good first issues
 - 1 small complexity issue
 - 1 medium complexity issue
 - 1 large complexity issue

After self assigning the issue can be moved to the "In Progress" lane.

# Check-Ins

Most issues should sized to be solvable within a week (and ideally within a day). When an issue has been assigned for a week, then a bot will automatically add the "Status: To Update !" label and leave a message. The goal here is to not be intrusive, but to quickly locate team members that need help, and provide a platform to communicate their needs and current status. The team member can then add an update, then manually replace the label with "Status: Updated".

Example Bot Message

```
Hi @ArendPeter!

This issue hasn't had activity in a while.

Please add a comment using the below template (even if you have a pull request).

Progress: "What is the current status of your project? What have you completed and what is left to do?"
Blockers: "Difficulties or errors encountered."
Availability: "How much time will you have in the coming weeks to work on this issue?"
ETA: "When do you expect this issue to be completed?"
Pictures (optional): "Add any pictures of the visual changes made to the site so far."

If you need help, please request for assistance on the #bettervoting slack channel.
```

If the issue isn't updated for a second week, then the "2 weeks inactive" label will be added. This signals to a Dev Lead to check in with the assignee, and if no updates are made within 3 days after that then the Dev Lead will unassign the issue.

Ensuring regular check-ins has a number of benefit for keeping the project sustainable:
 - Allows the Dev Leads to offer help when members are stuck.
 - Clarifies which issues are being worked on, and which ones need to be unassigned.
 - Since most issues will be pulled from the prioritized backlog, unassignment ensures that important issues freed up for others.
 - Hand offs will be easier since all context is in the issue.
 - Helps members judge their availability for future issues.

# Pull Request

Once you've opened a pull request (see our [pull request guide](https://docs.bettervoting.com/contributions/developers/2_how_to_open_a_pull_request.html) ), move your issue into the "Questions / In Review" lane.

Members can review any issue with a complexity that they've already resolved.

# Need help?

If a member is stuck on an issue they can apply the "Status: Help Needed" label, and also move it to the "Questions / In Review" lane in the board. This will alert other team members to come look at your issue to try to unblock them.

💡Idea: In the future there could also be a slack integration that automatically pings the #bettervoting channel with the issue number whenever a "Status: Help Needed" label is added to an issue.

# Discuss in Next Meeting

Most communication should happen async through updates on the issue it's self, but if an issue requires further discussion then it can be added to the "Discuss in Next Meeting" lane to be discussed in regular meeting.

Before regular meetings, the dev leads will ensure sort the items in the lane so that they're properly prioritized for the meeting. Then the meeting will have a decidated block (30-60 minutes) where we'll address as many issues as possible. Any issues left unaddressed will roll over to the next meeting. 

# Ice Box

When issues are blocked by other issues they should have the "blocked by" relationship set on the issue and moved into the Ice Box.

Once they're unblocked, they can be moved back into the "New Issue Approval" lane. It should always go up for reapproval (even if it's been approved previously) just in case there's been changes to the project priorities since the issue entered the Ice Box.

# Issue Parties

Consistently writing high quality issues is important to ensure the prioritized backlog has sufficient issues.

We hold occasional "Issue Parties" for the team to write and review issues.

Issue parties allow the team to build shared ownership of the tasks, and it spreads the effort of maintaining issues.

These meetings can have several different formats depending on the issues that are being made. 

# Dev Leads

Dev Leads is a team of experienced developers who have a broad understanding of the project. They're in charge of keeping the kanban flowing and ensuring that other developers are unblocked. They will also meet monthly to review our process.

Dev Leads have an "helper rotation" to ensure everything is reviewed in a timly manner. When dev leads have a turn as the helper they will check the following at least once per day:
 * Reviewing and Prioritizing issues
 * Reviewing and Merging Pull Requests
 * Assisting other devs who need help
 * Review incoming customer feedback
 * Checking on inactive issues

NOTE: This is a big list, but it should be managable with our current scale. As we grow we can consider spinning up a merge team to divide responsibilities.

Other members are also encouraged to participate in reviewing and merging issues, but there will also be a dev lead as back up.

IMPORTANT: This is NOT oncall, and the helper rotation only implies daily check ins. Acknowledging that we're a volunteer team, it *DOES NOT* imply constant availability. If urgent issues come up, then dev leads are welcome to assist, but Arend (as staff) will ultimately be accountable to triage those issues. 

Current Dev Leads: Arend Castelein, Jon Blauvelt, Jackson Loper

# Future Considerations
 * QA: After merge, there could be an extra QA step to verify the issue
 * Merge Team: As more devs get onboarded we could have an additional merge team. This team could split off some of the work from dev leads
 * 1 issue per member rule: This could have a couple of benefits, it creates more focus, it minimizes the management overhead for dev leads, and it encourages members to participate in reviewing other issues/PRs while their issue is in review.