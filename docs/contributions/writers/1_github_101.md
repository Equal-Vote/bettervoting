---
layout: default
title: 🐙 GitHub 101
nav_order: 1
parent: ✍ ️Writers
---

# GitHub 101

Adding your writing to BetterVoting will require using GitHub.

Luckily, all of your updates can be done using only the GitHub web interface (no need to learn any programming tools!). This page will walk through all the GitHub background knowledge you'll need.

## GitHub Account

Start by creating a GitHub account.

Once the account is ready, [drop an email to arendpeter@equal.vote](mailto:arendpeter@equal.vote?subject=Triage%20Permissions%20Request&body=Hi%20there!%20Please%20add%20triage%20permissions%20for%20INSERT_GITHUB_USER_NAME.) with your github user name so that you can be given triage permissions for issue assignment in the future (this will not block any of the steps on this page, so feel free to proceed after emailing).

## Github Vocabulary

Some github terms to be familiar with:

* **Repository / Repo** : These are projects in GitHub. They're stored as a file directory. Making changes to files in the repo will be similar to editing text files on your computer. Most of BetterVoting.com is contained in the [bettervoting repo](https://github.com/equal-vote/bettervoting). 
* **Pull Request / PR** : When you propose a change to a Repo this will be represented as a Pull Request. Then a project owner can review your changes and then "merge" your Pull Request so that it gets applied to the main project. In general don't be afraid to send out Pull Requests. Even if you're unsure if the change is correct, it's usually easier for the code owner to review the change in a Pull Request than to review changes adhoc.


## Navigating Directories

Once you're in the [bettervoting repo](https://github.com/equal-vote/bettervoting), you can click on the folders to navigate the directories. Here are some directories that will be the most useful to you.

* **bettervoting/docs/** : This directory contains all the writing for docs.bettervoting.com
* **bettervoting/packages/frontend/src/i18n/** : This directory contains all the writing for bettervoting.com (as well as all the translations)

## Search the Repo

If you're not sure which file you need to work in, then you can always search the repo.

Most GitHub pages have a couple of search boxes, but if you use the one at the very top right of the screen then that will search your current Repo by default.

If there's a specific typo you want to fix, then you can enter that text to bring you to the correct file. Usually that will be in one of the directories listed above, although there are some exceptions that are still baked into the software code.

## Editing a file

For editing an existing file...

1. Navigate to the desired directory
1. Click the desired file
1. Click the edit icon in the top right, and make your edits
1. Once edits are complete proceed to [Creating a Pull Request](#creating-a-pull-request)

## Adding a file

For adding a new file

1. Navigate to the desired directory
1. Click the desired file
1. Click the `Add file` -> `Create a new file` in the top right
1. Select ``Fork this repository`` (if prompted).
1. Name the file, and add your contents.
1. Once file is complete proceed to [Creating a Pull Request](#creating-a-pull-request)

## Creating a Pull Request

Once you're happy with your edits / additions. Proceed with the following to submit your proposal as a Pull Request.

1. Click "Commit Changes..."
1. Update commit message and description as desired. This summarizes your change so it's easier to view in the change history.
1. Click "Sign off and propose changes"
1. Click "Create Pull Request"
1. The code owner will usually review the Pull Request within a few days, but if they don't send an email to arendpeter@equal.vote

## Editing a Pull Request

If the code owner requests updates to your pull request, you can apply them as follows

1. Open the `File Changed` of your Pull Request.
1. Each changed file will have a `...` in the top right. Select the dots for the file you wish to update, and click `Edit File`.
1. Once edit is complete, proceed with the steps from [Creating a Pull Request](#creating-a-pull-request)

## Merging a Pull Request

Once the code owner has merged your Pull Request the changes will automatically be live on the website within an hour.

...and that's all you the GitHub you need to know 😉.
