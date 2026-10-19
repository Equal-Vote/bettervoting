---
name: submit-stack
description: Submit a local stack of branches (e.g. from a sandcastle run) as stacked draft PRs on Equal-Vote/bettervoting, with the Human Summary that CLAUDE.md requires. Use when the user wants to submit, open, or push a stack, or after a sandcastle run.
---

# Submit a stack as draft PRs

Turn a local stack of branches into a stacked PR on `Equal-Vote/bettervoting`, one draft PR per branch. You do the heavy lifting (titles, AI summaries, test plans, wiring the stack); the human supplies the Human Summary and approves the push.

Use the `gh-stack` extension (`gh extension install github/gh-stack`). If `gh stack` fails, check `gh extension list` before working around it.

## 1. Identify the stack

- If the branches are already a stack, `gh stack view --short` shows them.
- Otherwise get them from the user or the sandcastle run's output (the base branch, then the branches bottom to top). Don't change anything yet.
- `gh stack view` only knows branches added through gh-stack, so a branch made with plain git reports "not part of a stack" even when it sits on one. Don't take that as the answer. Check whether the base branch is part of an existing stack: `git checkout <base> && gh stack view --json`. If you don't know the base yet, run that from the branch's parent and from `main`, which lists the stacks on trunk.
  - **Not in a stack** (e.g. `main`): this is a **new stack** on that base.
  - **Top of an existing stack**: this is an **extension**. The new branches go on top of that stack, and its existing PRs stay as they are.
  - **In a stack but not at the top**: stop and ask the user. The new branches don't fit on the top, and putting them in the middle means restructuring the stack (`gh stack modify`), which the user should decide.
- Match by content, not by commit hash. A stack branch may have been amended locally without being pushed, so the new branch can sit on a commit that differs from the stack's recorded `head`. Compare with `git cherry <stack-branch-head> <branch>` or the commit subjects, and ask the user if the local and pushed versions of a stack branch differ.
- Confirm with the user the bottom-to-top order, the base, and whether this is a new stack or an extension.

## 2. Draft each PR

For each branch, compare it with the branch below it (`git diff <below>...<branch>`, `git log <below>..<branch>`). Branches named `sandcastle/issue-<ID>` fix that issue; read it with `gh issue view <ID> --repo Equal-Vote/bettervoting`.

Draft for each PR:
- A title (not the branch name).
- `## Summary`: what this PR changes, scoped to its own diff, not the whole stack.
- `## Test plan`: how a reviewer can check this branch, drawn from its issue's acceptance criteria and its diff (tests added, manual steps).
- `Closes #<ID>` for its issue.
- The attribution footer for PR descriptions.

## 3. Get the Human Summary

This is what CLAUDE.md requires. This is needed only for the new PRs. When extending a stack, the existing PRs already have theirs. You can show the user the existing stack's Human Summary as a starting point, but they still have to give or confirm the text for the new PRs. Ask the user, as plain text:

> Before I open these PRs — in a sentence or two: what are you trying to accomplish with this stack, and why? I'll put this at the top of each PR description, above my own summary, so reviewers get your context alongside the AI-generated details. If any PR needs its own note, tell me which.

The answer must cover both the **what** and the **why**. If it only covers one, ask a follow-up for the other. Don't write it yourself, and don't open PRs without it.

Each PR body is then:

```
## Human Summary
<user's answer, verbatim>

## Summary
...

## Test plan
...
```

## 4. Confirm, then submit

Show the user the full plan: base branch, the branches bottom to top with titles, the remote, and each PR body. Pushing to `Equal-Vote/*` needs explicit confirmation (CLAUDE.md). Wait for a yes before going on.

Stacked PRs can't span forks, so branches go to the remote whose URL is `github.com/Equal-Vote/bettervoting` (case-insensitive). Find its name in `git remote -v`, because names differ between clones.

New stack:

```
gh stack init --base <base> <branches...>
gh stack submit --auto --remote <equal-vote-remote>
```

Extension. `gh stack add` called with an existing branch adopts it into the stack. `init` refuses branches that are already in a stack.

```
git checkout <top of existing stack>
gh stack add <branch1>      # bottom of the new branches; now the current branch
gh stack add <branch2>      # ...and so on, bottom to top
gh stack submit --auto --remote <equal-vote-remote>
```

`--auto` creates the new PRs as drafts. Never pass `--open`, because it would also mark the existing PRs ready for review. `submit` creates PRs only for branches that don't have one, so the existing PRs keep their titles, bodies and draft state.

Then set each new PR's title and body. Don't edit the existing PRs:

```
gh pr edit <number> --repo Equal-Vote/bettervoting --title "<title>" --body-file <file>
```

Write the bodies to files in the scratchpad, not in the repo.

## 5. Hand off

Run `gh stack view` and give the user the PR links bottom to top. Say plainly that they're drafts and theirs to review before they go to their dev lead. Never run `gh pr ready` unless the user asks for it right then.
