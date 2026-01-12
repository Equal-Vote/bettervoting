---
name: 'Onboarding Issue: Developer'
about: Helps new develoeprs get started on the team
title: 'Onboarding Issue: Developer: [replace brackets with your name]'
labels: 'Complexity: Prework, Role: Missing'
assignees: ''

---

### Overview
As a developer on BetterVoting this issue will be your companion and a place to track your progress with the path we have set out for you.

### Special Notes
1. This issue will stay open for as your solving your first issues. Use it as a place to indicate that you have completed a level as well as get instructions on how to progress. 
1. The action items listed below should mostly be worked on in a sequential order. However, you don't have to wait on one if you can proceed with the others. For instance, you don't have to wait for GitHub permissions before setting up your Dev Environment.
1. If you have any feedback on the template (structure, typos, broken links, confusing experience), the please leave a comment on #1144 to ensure it's fixed in the next refresh of the template.
1. If you get stuck or need to leave the project check the [FAQ section](#section-faq) for the recommended steps to take.

<a name="table-of=contents"></a>
### Action Items
#### Table of Contents
Sections
 1 - [Joining the team](#section-1)
 2 - [GitHub Permissions](#section-2)
 3 - [Development Environment Setup](#section-3)
 4 - [First GitHub Issue (GFI)](#section-4)
 5 - [Weekly Updates](#section-5)
 6 - [1st Pull Request](#section-6)
 7 - [Additional reading 1](#section-7)
 8 - [2nd good first issue](#section-8)
 9 - [Pull Request Reviews - GFI](#section-9)
10 - [Additional reading 2](#section-10)
11 - [Small Issue](#section-11)
12 - [Pull Request Reviews - Small](#section-12)
13 - [Self-Guided UX Scenarios](#section-13)
14 - [Proceed to Resolve Other Issues](#section-14)

[FAQ](#section-faq)
[Resources](#resources)


<a name="section-1"></a>
#### 1 - JOINING THE TEAM.

- [ ] Join the [starvoting slack](https://join.slack.com/t/starvoting/shared_invite/zt-110yy22zo-hPVb8IH_wUQo5awd5UtajQ)
- [ ] Add yourself to the [#bettervoting channel](https://starvoting.slack.com/archives/C01EBAT283H)
- [ ] RSVP to the next Equal Vote Orientation at starvoting.org/events
- [ ] RSVP to the next Software Meeting at starvoting.org/events
- [ ] Fill out the [INTAKE Self Test](#Intake_Skills_List) so that we can help you find issues that will match where you need to fill in.
- [ ] Post the following message in a comment below on this issue and then answer it.

    ```
    ### 1 - JOINING THE TEAM update
    >How many hours did it take you to finish this step?
    
    A:
   
    [return to section 1](#section-1)
    ```

[**⇧** Table of Contents](#table-of=contents)

#### 2 - GitHub Permissions

This section will grant you sufficient GitHub permissions for self assigning issues, and moving items on the project board.

Please continue to [Section 3](#section-3) while a Dev Lead completes their steps, then return here to complete the section.

Executed by Dev Lead

- [ ] Navigate to the [BetterVoting Repo](https://github.com/Equal-Vote/bettervoting), then enter the "Settings" tab, and open the "Collaborators and teams" tab.
- [ ] Click "Add People" to add the new team member and grant them Triage Access
- [ ] Wait for the team member to accept the invitation
- [ ] Navigate to the [BetterVoting Project Board](https://github.com/orgs/Equal-Vote/projects/3/views/1)
- [ ] Using the 3 dots in the top right open "Settings", then go to "Manage Access" 
- [ ] Invite the new team member to have the "Write" role
- [ ] Move the issue into the Prioritized Backlog
- [ ] Leave a comment on this issue indicating that the steps were completed

```
I've granted you Triage permissions. Please complete the remaining steps in Section 2.

[return to section 2](#section-2)
```

Executed by New Team Member

- [ ] Self assign this issue (gear in right side panel).  
  - [ ] If there are no gears in the right side panel of this issue (next to Assignees, Labels, Projects, Milestone, Development): 
     - [ ] check to see if you are logged in to GitHub (if you are not logged in you will see a sign in button on the top right of this browser tab).  
         - if you are not logged in
            - [ ] log in and try to self assign again.  If that does not work, continue with the instructions below.
         - if you are logged in
            - [ ] Send the following message in the [#bettervoting slack channel](https://starvoting.slack.com/archives/C01EBAT283H)
               ```
               Hi. I don't see the gear on my issue, here are my details:
               - issue: #
               - GitHub handle:
               ```
            - [ ] add the following text to a comment on this issue
               ```
               I don't have access, I have messaged the team in the bettervoting Slack channel.

               [return to section 1](#section-2)
               ```
- [ ] Add the `Role: Front End` or `Role: Back End` or both label(s) to this issue and remove the `Role: Missing` label (gear in right side panel)
- [ ] On the right under Project set the status to "In Progress"
- [ ] Post the following message in a comment below on this issue and then answer it.
    ```
    ### 2 - GitHub Permissions update

    I've completed section 2
    
    [return to section 2](#section-2)
    ```

[**⇧** Table of Contents](#table-of=contents)
 
<a name="section-3"></a>
#### 3 - DEVELOPMENT ENVIRONMENT SETUP
- [ ] Follow the [local setup guide](https://docs.bettervoting.com/contributions/developers/1_local_setup.html) until you have the Front End running locally
  - [ ] OPTIONAL: If you run into any issues, refer to the [FAQ Section](#faq-section) for details on asking for help.
- [ ] OPTIONAL: Back End developers should continue the setup guide also to run the backend locally using Docker.
- [ ] If you have never setup your development environment before, please update your [Ongoing Skills List](#Ongoing_Skills_List) to check off "Setting up your local environment for a open source project"
- [ ] Post the following message in a comment below on this issue and then answer it.  While keeping in mind that this is just to get feedback on how long it took you to get to this point. There is no right or wrong answers. There is no judgement. It is ok if you take a long time or if you do it really fast or at any pace.  Getting your dev environment setup will be easier for some people because they might already have some experience or items installed on their computer and you may not. This is an important step, be patient with yourself and your computer but keep on it till you get it done.
    ```
    ### 3 - GETTING YOUR DEVELOPMENT ENVIRONMENT SETUP update
    >How many hours did it take you to finish this step?
    
    A:
    
    [return to section 3](#section-3)
    ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-4"></a>
#### 4 - FINDING AND ASSIGNING YOUR FIRST GITHUB ISSUE (GFI)
- [ ] Read the [Issue Label Descriptions](https://docs.bettervoting.com/contributions/4_issue_lifecycle.html#issue-labels) in the Issue life cycle document
- [ ] Read the [Assigning Issues Section](https://docs.bettervoting.com/contributions/4_issue_lifecycle.html#issue-assignment-progression)
- [ ] Take the first issue from this prefiltered view of the project board (status: prioritized backlog, good first issues = [dev: GFI](https://github.com/orgs/Equal-Vote/projects/3/views/4)
  - [ ] Follow the steps from [Assigning Issues Section](https://docs.bettervoting.com/contributions/4_issue_lifecycle.html#issue-assignment-progression) to assign yourself your first issue.
  - [ ] Move your issue from the Project Board's "Prioritized Backlog" column to the "In progress" column and start working on the issue
- [ ] Post the following message in a comment below on this issue and then answer it.
    ```
    ### 4 - FINDING AND ASSIGNING YOUR FIRST GITHUB ISSUE update
    > which issue did you self assign?

    A: (issue id starting with #)

    [return to section 4](#section-4)
    ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-5"></a>
#### 5 - GIVING WEEKLY UPDATES ON YOUR DEVELOPMENT ISSUES
- [ ] Progress Reports: Copy the below and put it in the issue once you have been assigned to the issue at least 5 days (we check weekly on Fridays), or sooner if you have something to report.  If you finish this issue before 5 days are reached, Yeah!!, do it on your next issue. **This update should be done every week for every issue that you are assigned to**. The checkbox here is meant for us to see if you understood the instructions when you end up doing your first weekly progress update.
    ```
    Provide Update
    1. Progress
    2. Blockers
    3. Availability
    4. ETA
    ```
- [ ] Post the following message in a comment below on this issue and then answer it.
    ```
    ### 5 - GIVING WEEKLY UPDATES ON YOUR DEVELOPMENT ISSUES update
    >on what issue did you give your first weekly update?
    
    - #
    
    [return to section 5](#section-5)
    ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-6"></a>
#### 6 - SUBMITTING YOUR FIRST PULL REQUEST
- [ ] Read [How to open a pull request](https://docs.bettervoting.com/contributions/developers/2_how_to_open_a_pull_request.html)
- [ ] Once you've opened the pull request verify that the PR is linked in your original issue (this should happen automatically if the correct [linking convention](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue))
- [ ] Move your issue into the "Questions / In Review" lane on the project board and a helper will come by to help review. (Feel free to proceed to [Section 7](#section-7)) while you wait)
- [ ] Once your pull request has been accepted, post the following message in a comment below on this issue and then answer it.
   ```
   ### 6 - PULL REQUESTS update
   >What is the number of your first merged pull request?
   - #
   >Did you receive any reviews that required you to change anything on your PR? 
   - [ ] no
   - [ ] yes (if yes, describe what you learned)
   
   Comments: 
  
   [return to section 6](#section-6)
   ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-7"></a>
#### 7 - FOUNDATIONAL READING TO GET FAMILIAR WITH THE PROJECT

- [ ] Read the [BetterVoting about page](https://bettervoting.com/about) to get a sense for who's who in our leadership team.
- [ ] BetterVoting is a project of the Equal Vote Coalition. Read the [equal.vote](https://www.equal.vote/) homepage to learn more about our mission. Equal Vote advocates for better voting methods, and bettervoting.com is a key tool to make it easy for organizations.
- [ ] Skim [STAR Voting's Case Studies](https://www.starvoting.org/case_studies). Many of these elections would not have been possible without BetterVoting.com, and as we build the website we hope to grow STAR Voting's adoption even more!
    ```
    ### 7 - FOUNDATIONAL READING TO GET FAMILIAR WITH THE PROJECT update
    >How many hours did it take you to finish this step?
    
    A:

    [return to section 7](#section-7)
    ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-8"></a>
#### 8 - MOVE ON TO 2ND GOOD FIRST ISSUE (AKA, IT GETS EASIER!)

Now that you've completed a good first issue, you can add yourself to the contributor list! This will also be your second good first issue.

We have you do another simple issue because this we want you to 
 - see the difference once you have successful setup your dev environment
 - see how each PR gets easier to do with repetition
 - make sure you know how to branch properly (most problems show up in the second commit)

- [ ] Go to the [repository issues page](https://github.com/Equal-Vote/bettervoting/issues)
- [ ] Click "New Issue" and select the "Blank Issue Template"
- [ ] Fill out the form as follows

Title 

```
Add <insert your name> to the contributor list
```

Overview

```
<insert your name> has completed a good first issue, and is ready to listed among the contributors. Keeping the contributor list updated allows members to get recognition and helps reflect the scope of our team. 
```

Action Items

```
- [ ] Open the en.yaml file and find search for "contributors:". en.yaml has all of our localized text, and it also contains some web content such as our contributor list.
- [ ] Add an entry to the end of the contributor list with <insert your GitHub user id>
   \`\`\`
      - github_user_name: <your GitHub user id>
         github_image_id: <your GitHub image id>
   \`\`\`
- [ ] For the GitHub image id right click on your profile picture on github and copy the image url
<img width="319" height="287" alt="Image" src="https://github.com/user-attachments/assets/804f92be-45fe-4420-9fd3-c3573794bafb" />
- [ ] The link is formatted as "https://avatars.githubusercontent.com/u/<IMAGE_ID>?v=4", use IMAGE_ID in the yaml
```

Resources

```
bettervoting.com/about
```

- [ ] Create the issue
- [ ] Update the Complexity and Role. In general you should always replace these labels whenever creating a new issue.
   - [ ] Replace the default "Complexity: Missing" with "Good First Issue"
   - [ ] Replace the default "Role: Missing" with "Role: Front End"
- [ ] Update the Milestone, Project Lane, and Assignment. This is an exception from our standard process. Usually after creating an issue you should wait for the a Dev Lead to set the milestone and move it into the Prioritized Backlog before you can self assign.
   - [ ] Set the milestone to "Project Management"
   - [ ] Self-assign the issue
   - [ ] Move the issue to the In Progress Lane
- [ ] Submit your PR

- Once your pull request has been accepted
   - [ ] Update your [Ongoing Skills List](#Ongoing_Skills_List) to check off "Pull Requests"
   - [ ] post the following message in a comment below on this issue and then answer it.
       ```
       ### 8 - MOVE ON TO 2ND GOOD FIRST ISSUE update
       >What is the number of your 2nd merged pull request?
       - #
       >Did you receive any reviews that required you to change anything on your PR? 
       - [ ] no
       - [ ] yes (if yes, describe what you learned)
       
       Comments: 
       
       [return to section 8](#section-8)
       ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-9"></a>
#### 9 - REVIEWING PULL REQUESTS
Now that you have two merged `good first issue` PRs, you are eligible to review [good first issue PRs, Review Required](https://github.com/Equal-Vote/bettervoting/pulls?q=is%3Apr+is%3Aopen+label%3A%22good+first+issue%22+review%3Arequired+), and in general once you've solved an issue of a certain complexity, you will also be elligible to review PRs with that same complexity.

See [How to review Pull Requests](https://github.com/hackforla/website/wiki/How-to-review-pull-requests) guide will teach you how to review pull requests.

NOTE: We're working on our own version of the How to Review Pull Requests Document, details are at #1128.

Continue to review 3 `good first issue` PRs. This repays the effort for the 2 PRs you submitted, and along with an extra review to account for members who haven't made it this far. All team members are encouraged to review PRs to build their own skills and to keep items progressing through the queue. Once a PR has been approved, a member of Dev Leads will do a final verification and merge the PR.
- [ ] reviewed 1st `good first issue` pr
- [ ] reviewed 2nd `good first issue` pr
- [ ] reviewed 3nd `good first issue` pr
   - [ ] After each PR that your review, please paste the following text in a comment below
      ```
      ### 9 - PULL REQUEST REVIEWS - GFI - Update
      I have reviewed a 'good first issue' PR #
      >Did you catch anything?

       - [ ] yes
       - [ ] no
       
      >If you did't catch anything, did anyone else who reviewed it after you, catch anything?

       - [ ] no
       - [ ] yes

           >if yes, describe what you learned:
   
          A: 
 
      [return to section 9](#section-9)
      ```
      - [ ] Once all 3 good first PRs have been merged, check of the box for "good first issue" under "Reviewed other people's Pull Requests" on the [Ongoing Skills List](#Ongoing_Skills_List)
   - [ ] If there are no `good first issue` PRs to review right now, paste this comment instead and check back later.  You can also go onto section 10.
      ```
      ### 9 - PULL REQUEST REVIEWS - GFI - Update
      There are currently no `good first issue` PRs to review, but I'll check back later.
      
      [return to section 9](#section-9)
      ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-10"></a>
#### 10 - UNDERSTAND HOW TO PROGRESS THROUGH ISSUES IN THE PRIORITIZED BACKLOG AND ON ISSUE MAKING AND TEMPERATURE CHECK
Congrats on making it this far.  Issues get more complicated from here, either they include more changes, or have several files to change or you have to research something that we are unsure how to do, or there is complicated logic that needs writing or rewriting. Each issue size that you take on will guide you to a more complicated level in sequence, and you can see from the labels and overviews what they are about.  

Its important that you try to work on issues that fill in gaps in your knowledge (see the self tests for a reminder about what to look for).  
- [INTAKE  Self Test](#Intake_Skills_List)
- [ONGOING Skills List](#Ongoing_Skills_List)

So keep going, the fun stuff is about to start.

Having said that, we are also going to have you take on some issue making (surprise! There is no issue making fairy, only volunteers like you that created issues for the people that come after them).  Pay attention to how the issues you have already worked on are constructed and how they change as they go up the ladder. That way when we start you on the issue making portion of the team work, you will know what you are shooting for when its your time to make issues.

This will ensure you are a competent developer and an awesome collaborative contributor to any team you join in the future.

- [ ] Let us know that you have re-reviewed your issues, have read the above and are continuing on the team
    ```
    ### 10 - UNDERSTAND HOW TO PROGRESS THROUGH ISSUES IN THE PRIORITIZED BACKLOG AND ON ISSUE MAKING update
    >Up to now we have just been getting you ready.  Now the fun starts.  Are you continuing?
    - [ ] I'm so ready, bring it on (continuing)
    - [ ] I am worn out from the setup and the good first issues but still game (continuing)
    - [ ] I won't be continuing, (please let us know why and close this issue)
    
    Comments:
    
    [return to section 10](#section-10)
    ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-11"></a>
#### 11 - MOVING ON TO A SMALL ISSUE
- [ ] Assign yourself a small issue, for the role you have indicated, from this prefiltered view of the project board (status: prioritized backlog, small = [dev: small](https://github.com/orgs/Equal-Vote/projects/3/views/5))
- [ ] Submit your PR  
- [ ] Once your pull request has been merged post the following message in a comment below on this issue and then answer it:
    ```
    ### 11 - SMALL update
    >What is the number of your small merged pull request?
    - #
    >Did you receive any reviews that required you to change anything on your PR? 
    - [ ] no
    - [ ] yes (if yes, describe what you learned)

    Comments: 
    
    [return to section 11](#section-11)
    ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-12"></a>
#### 12 - PULL REQUEST REVIEWS - SMALL
Now that you have your small PR merged, you are eligible to review [small PRs, Review Required](https://github.com/Equal-Vote/bettervoting/pulls?q=is%3Apr+is%3Aopen+label%3A%22Complexity%3A+Small%22+review%3Arequired) from other people who are following in the same journey path as you.

Please review 2 `small` PRs.  By reviewing 2 small PRs you are repaying the effort that others did for you (provided 1 review for your 1 small issue PR) plus 1 extra review to help us all make up the deficit for people who submit small PRs and then drop off the team.
- [ ] reviewed 1st `small` pr
- [ ] reviewed 2nd `small` pr
   - [ ] When you have reviewed a `small` PR, please paste the following text in a comment below
      ```
      ### 12 - PULL REQUEST REVIEWS - Small - Update
      I have reviewed a `small` PR #
  
      >Did you catch anything?

       - [ ] yes
       - [ ] no
      >If you did't catch anything, did anyone else who reviewed it after you, catch anything?

       - [ ] no
       - [ ] yes
  
         >if yes, describe what you learned:
         
         A: 
         
      [return to section 12](#section-12)
      ```
      - [ ] Once both small complexity PRs have been merged, check off the box for "small" under "Reviewed other people's Pull Requests" on the [Ongoing Skills List](#Ongoing_Skills_List)
   - [ ] If there are no `small` PRs to review right now, paste this comment instead and check back later.  You can also go onto section 13.
      ```
      ### 12 - PULL REQUEST REVIEWS - Small - Update
      There are currently no `small` PRs to review, but i'll check back later.
      
      [return to section 12](#section-12)
      ```

[**⇧** Table of Contents](#table-of=contents)

<a name="section-13"></a>
#### 13 - SELF-GUIDED UX SCENARIOS

We've documented [a couple of UX scenarios](https://docs.bettervoting.com/contributions/5_self_guided_ux_scenarios.html) that are primarily used for testing the experience with real users. 

There are also several benefits for new members self-guiding through the scenarios:
 - It helps you get familiar with features on the website.
 - With a fresh perspective, you'll be more equipped to identify difficult interfaces.
 - When you do find issues, this is an opportunity for you to practice writing issues in GitHub.

Go ahead and complete the scenarios and when you're finished return here to leave an update 

    ```
    ### 13 - SELF-GUIDED UX SCENARIOS
    > Did you create any issues? Link them here
    - #

    >Anything else you'd like to share from your experience?
    - [ ] no
    - [ ] yes (if yes, describe it here)

    Comments: 
    
    [return to section 13](#section-13)
    ```

<a name="section-14"></a>
#### 14 - PROCEED TO RESOLVE OTHER ISSUES

This is the end of the onboarding guide for now, but your next steps will proceed as follows:
 - Solve a medium issue
 - Review a medium issue
 - Solve a large issue
 - Review a large issue

From there continue to grab issues from the Prioritized Backlog, and we'll continue building a tomorrow with better elections!

 A dev lead may update this issue as we proceed to develop the onboarding template.

<a name="section-faq"></a>
#### FAQ section

<details><summary>What should I do if I have a question about an issue I'm working on, and I haven't gotten a response yet?</summary>

- First, you should post the question or blocker as a comment on your assigned issue, so it can be easily referred to in the next bullet points.
- Then, move the project board status to `Questions / In Review` so other developers can see it and potentially help answer your question. In addition, you will still need to post a Slack message or bring it up in meeting so we know you need help; see below for how to do that.
- Also, you can post your question on the [#bettervoting slack channel](https://starvoting.slack.com/archives/C01EBAT283H) and link the issue you're working on, so other developers can see and respond.
</details> 

<details><summary>If you need to take some time off from the team</summary>

- For this Onboarding Issue, please do the following:
   - Copy and customize this response, and leave it in a comment on this issue
      ```
      I need to take some time off from the team. I believe I will be back on [Replace with DATE YOU WILL BE BACK]
       ```
   - Apply the label `away on hold`.
   - Move your Onboarding Issue to the `Questions / In Review` column.
- In addition, if you are assigned to an open issue (other than your Onboarding Issue), do the following for that issue:
   - If you have done some work on the issue, please write thorough documentation in a comment in that issue so that the issue can be handed off to another person, who can pick up working where you left off based on your notes.
   - Move it to the 'New Issue Approval` column.
   - Then, unassign yourself from that issue.
</details> 

<details><summary>If you need to leave the team</summary>

Contact a Dev Lead on slack, and let them know about your departure. Their contact information is listed the [BetterVoting About Page](bettervoting.com/about). They can sort out the project board and make sure that everything is in order. Good luck in your future endeavors!

</details> 

[**⇧** Table of Contents](#table-of=contents)

### Resources/Instructions
- [Local Setup Guide](https://docs.bettervoting.com/contributions/developers/1_local_setup.html)
- [GitHub Project Board - BetterVoting](https://github.com/orgs/Equal-Vote/projects/3)
- [BetterVoting HUB](https://docs.google.com/spreadsheets/d/1nN-w0hn2ltbtnczBVsaZONagAVBmUISyI7eXY5rnyqU/edit?gid=0#gid=0)
- To find contact information team leads, please take a look at [The BetterVoting About Page](https://bettervoting.com/about)

[**⇧** Table of Contents](#table-of=contents)

---
<a name="Intake_Skills_List"></a>

### Skills List - INTAKE
Skills List, self test on Intake, fill out when you join the team, don't update

   Front End
   - [ ] Setting up your local environment for a open source project
   - [ ] GitHub branching
   - [ ] Pull Requests

   Back End
   - [ ] API requests
   - [ ] Cron Job Scripting
   - [ ] CRUD operations

   All Developers
   - [ ] Reviewed other people's Pull Requests
   - [ ] Resolved Merge Conflicts
   - [ ] Written documentation for other Developers (Architecture, etc.)
   - [ ] Mentored other developers

Return to 
[section 1](#section-1)
[section 10](#section-10)


<a name="Ongoing_Skills_List"></a>

### Skills List - ONGOING
Skills List, update as you do work on BetterVoting

   Front End
   - [ ] Setting up your local environment for a open source project ([section 3](#section-3))
   - [ ] Pull Requests ([section 8](#section-8))

   Back End
   - [ ] API requests
   - Cron Job Scripting
      - [ ] edit GitHub Action
      - [ ] write GitHub Action
   - [ ] CRUD operations

   All Developers
   - Reviewed other people's Pull Requests
      - [ ] good first issue ([section 9](#section-9))
      - [ ] small ([section 12](#section-12))
      - [ ] medium
      - [ ] large
   - [ ] Resolved Merge Conflicts
   - [ ] Written documentation for other Developers (Architecture, etc.)
   - [ ] Mentored other developers


[**⇧** Table of Contents](#table-of=contents)
