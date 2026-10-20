# TASK

Layer the following branches onto a stack of branches, so each one can become its own PR in a stacked PR. Each branch must contain only its own issue's changes relative to the branch below it.

Current stack, bottom to top (the bottom branch is based on `{{BASE_BRANCH}}`):

{{STACK}}

Branches to add on top, in this order:

{{BRANCHES}}

The branch to build on starts as the top of the current stack, or `{{BASE_BRANCH}}` if the stack is empty. For each branch to add:

1. Run `git checkout <branch>` then `git rebase <branch to build on>`
2. If there are conflicts, resolve them intelligently by reading both sides and choosing the correct resolution, then `git rebase --continue`
3. Run `npm run build -ws` and `npm test` to verify everything works
4. If the build or tests fail, fix the issues and commit the fix on this branch
5. This branch is now the branch to build on for the next one

If a branch can't be checked out, or you can't get it building and passing tests, run `git rebase --abort` if a rebase is in progress, leave that branch out of the stack, and carry on with the next branch on top of the last one that succeeded.

Do not push anything, and do not open PRs. The human reviewer will QA the stack and submit it.

When you're done, check out the top branch of the stack (the last branch that was added, or the previous top if none were added), so the next round of work builds on it.

# ISSUES

Here are the issues for the branches to add:

{{ISSUES}}

For each branch that was added to the stack, close its issue. This stops future planning runs from picking it up again, and unblocks any issues that depend on it so the next round can work on them. The stacked PR will still link to the issue.

`gh issue close <ID> --repo Equal-Vote/BetterVoting --reason completed --comment "Implemented on branch \`<branch>\` in a Sandcastle stack; its PR will link back here."`

Do not close the issue of a branch that was left out of the stack.

# OUTPUT

Output the branches you added to the stack, bottom to top, as JSON wrapped in `<stack>` tags. Include only the branches added in this run, not the existing stack:

<stack>
{"branches": ["sandcastle/issue-42", "sandcastle/issue-43"]}
</stack>

If no branches could be added, output `<stack>{"branches": []}</stack>`.

Then output <promise>COMPLETE</promise>.
