---
layout: default
title: 📤 Opening a Pull Request
nav_order: 2
parent: 💻 Developers
---

# How to open a Pull Request (PR)

<!-- Most of this setup was shamelessly copied from https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/docs/how-to-open-a-pull-request.md-->

A pull request (PR) enables you to send changes from your fork on GitHub to BetterVoting's main repository. Once you are done making changes to the code, you can follow these guidelines to open a PR.

> Your PR should be in English. If you're interested in helping with translations, message the [#_software-dev slack channel](https://starvoting.slack.com/archives/C01EBAT283H)

> If you haven't joined the STAR Voting slack yet, you can follow the instructions [here](https://www.starvoting.us/get_involved) to get added

## Prepare a good PR title

We recommend using [conventional title and messages](https://www.conventionalcommits.org/) for commits and pull request. The convention has the following format:

> `<type>([optional scope(s)]): <description>`
>
> For example:
>
> `fix(learn): tests for the do...while loop challenge`

When opening a Pull Request(PR), you can use the below to determine the type, scope (optional), and description.

**Type:**

| Type  | When to select                                                                   |
| :---- | :------------------------------------------------------------------------------- |
| fix   | Changed or updated/improved functionality, tests, etc. |
| feat  | Only if you are adding new functionality, tests, etc.                            |
| chore | Changes that are not related to code or tests.            |
| docs  | Changes to `/docs` directory or the contributing guidelines, etc.                |

**Scope:**

You can select a scope from [this list of labels](https://github.com/Equal-Vote/bettervoting/labels?q=scope).

**Description:**

Keep it short (less than 30 characters) and simple, you can add more information in the PR description box and comments.

Some examples of good PR titles would be:

- `fix(a11y): improved search bar contrast`
- `feat: add more tests to HTML and CSS challenges`
- `fix(api,client): prevent CORS errors on form submission`
- `docs(i18n): Chinese translation of local setup`

## Proposing a Pull Request

1. Once the edits have been committed, you will be prompted to create a pull request on your fork's GitHub Page.

   ![Image - Compare & pull request prompt on GitHub](https://contribute.freecodecamp.org/images/github/compare-pull-request-prompt.png)

2. By default, all pull requests should be against the bettervoting main repo, `main` branch.

   Make sure that your Base Fork is set to Equal-Vote/bettervoting when raising a Pull Request.

   ![Image - Comparing forks when making a pull request](https://contribute.freecodecamp.org/images/github/comparing-forks-for-pull-request.png)

3. Submit the pull request from your branch to bettervoting's `main` branch.

4. In the body of your PR include a more detailed summary of the changes you made and why.

   - You will be presented with a pull request template. This is a checklist that you should have followed before opening the pull request.

   - Fill in the details as you see fit. This information will be reviewed and the reviewers will decide whether or not your pull request is accepted.

   - If the PR is meant to address an existing GitHub Issue then, at the end of
     your PR's description body, use the keyword _Closes_ with the issue number to [automatically close that issue if the PR is accepted and merged](https://help.github.com/en/articles/closing-issues-using-keywords).

     > Example: `Closes #123` will close issue 123

5. Indicate if you have tested on a local copy of the site or not.

   - This is very important when making changes that are not just edits to text content like documentation or a challenge description. Examples of changes that need local testing include JavaScript, CSS, or HTML which could change the functionality or layout of a page.

## Feedback on pull requests

> :tada: Congratulations on making a PR and thanks a lot for taking the time to contribute.

Our contributors will now take a look and leave you feedback. Please be patient with the fellow moderators and respect their time. All pull requests are reviewed in due course.

And as always, feel free to ask questions on the [#_software-dev slack channel](https://starvoting.slack.com/archives/C01EBAT283H).

## Conflicts on a pull request

Conflicts can arise because many contributors work on the repository, and changes can break your PR which is pending a review and merge.

More often than not you may not require a rebase, because we squash all commits, however, if a rebase is requested, here is what you should do.

### For usual bug fixes and features

When you are working on regular bugs and features on our development branch `main`, you are able to do a simple rebase:

1. Rebase your local copy:

   ```
   git checkout <pr-branch>
   git pull --rebase upstream main
   ```

2. Resolve any conflicts and add / edit commits

   ```
   # Either
   git add .
   git commit -m "chore: resolve conflicts"

   # Or
   git add .
   git commit --amend --no-edit
   ```

3. Push back your changes to the PR

   ```
   git push --force origin <pr-branch>
   ```