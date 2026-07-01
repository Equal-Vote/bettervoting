# TASK

Look at the local commits that were just made (use `git log origin/main..HEAD --oneline` to list them, and `git show <sha>` or `git diff origin/main..HEAD` for details).

Write a GitHub issue that summarizes the work done and gives a human reviewer clear manual QA steps to follow before the changes are pushed.

Create the issue with:

```
gh issue create --title "<short descriptive title>" --body "<body>"
```

The issue body must follow this structure:

## Summary

A concise paragraph describing what was built or changed and why.

## Changes

A bullet list of the meaningful changes made (grouped by feature/fix if there are several).

## Manual QA Steps

Checkbox list steps a human can follow to verify the changes work correctly in the browser or CLI. Be specific: mention which pages, interactions, or commands to test. Include expected outcomes for each step.

## Notes

Any caveats, known issues, or things the reviewer should be aware of.

Once the issue is created, output its details as JSON wrapped in `<qa-issue>` tags:

<qa-issue>
{"id": "123", "url": "https://github.com/owner/repo/issues/123"}
</qa-issue>

Then output <promise>COMPLETE</promise>.