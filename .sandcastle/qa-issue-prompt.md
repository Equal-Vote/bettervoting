# TASK

A stack of branches was just built on top of `{{BASE_BRANCH}}`. Each branch is one PR in a stacked PR, bottom to top:

{{STACK}}

Look at the work in the stack. Use `git log {{BASE_BRANCH}}..<branch> --oneline` and `git diff <branch below>...<branch>` to see what each branch adds, and `git diff {{BASE_BRANCH}}...HEAD` for the whole stack. Each branch is named after the issue it fixes (`sandcastle/issue-<ID>`); read the issue with `gh issue view <ID> --repo Equal-Vote/BetterVoting` for context.

Write a single GitHub issue that summarizes the work done and gives a human reviewer clear manual QA steps to follow before the stack is submitted as PRs.

Create the issue with:

```
gh issue create --repo Equal-Vote/BetterVoting --title "QA: <short descriptive title>" --body "<body>"
```

The issue body must follow this structure:

## Summary

A concise paragraph describing what was built or changed and why.

## Stack

A list of the branches, bottom to top, each with the issue it fixes (`#<ID>`) and a one-line description of what it adds.

## Manual QA Steps

Checkbox list steps a human can follow to verify the changes work correctly in the browser or CLI, grouped under a heading per branch in stack order. Be specific: mention which pages, interactions, or commands to test. Include expected outcomes for each step.

## Notes

Any caveats, known issues, or things the reviewer should be aware of, including any branches that were left out of the stack.

Once the issue is created, output its details as JSON wrapped in `<qa-issue>` tags:

<qa-issue>
{"id": "123", "url": "https://github.com/Equal-Vote/BetterVoting/issues/123"}
</qa-issue>

Then output <promise>COMPLETE</promise>.
