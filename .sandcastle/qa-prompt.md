# TASK

Look at the commits made on this branch for issue {{TASK_ID}} (use `git log origin/main..HEAD --oneline` to list them, and `git show <sha>` or `git diff origin/main...HEAD` for details).

Write a comment on issue {{TASK_ID}} that summarizes the work done and gives a human reviewer clear manual QA steps to follow before the changes are merged.

Post the comment with:

```
gh issue comment {{TASK_ID}} --body "<body>"
```

The comment body must follow this structure:

## Summary

A concise paragraph describing what was built or changed and why.

## Manual QA Steps

Checkbox list steps a human can follow to verify the changes work correctly in the browser or CLI. Be specific: mention which pages, interactions, or commands to test. Include expected outcomes for each step.

## Notes

Any caveats, known issues, or things the reviewer should be aware of.

Once the comment has been posted, output <promise>COMPLETE</promise>.
