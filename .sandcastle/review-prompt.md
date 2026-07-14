# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff

!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

1. **Understand the change**: Read the diff and commits above to understand the intent.

2. **Analyze for improvements**: Look for opportunities to:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear variable and function names
   - Consolidate related logic
   - Remove unnecessary comments that describe obvious code
   - Avoid nested ternary operators - prefer switch statements or if/else chains
   - Choose clarity over brevity - explicit code is often better than overly compact code

3. **Check correctness**:
   - Does the implementation match the intent? Are edge cases handled?
   - Are new/changed behaviours covered by tests?
   - Are there unsafe casts, `any` types, or unchecked assumptions?
   - Does the change introduce injection vulnerabilities, credential leaks, or other security issues?

4. **Maintain balance**: Avoid over-simplification that could:
   - Reduce code clarity or maintainability
   - Create overly clever solutions that are hard to understand
   - Combine too many concerns into single functions or components
   - Remove helpful abstractions that improve code organization
   - Make the code harder to debug or extend

5. **Apply project standards**: Follow the coding standards defined in @.sandcastle/CODING_STANDARDS.md

6. **Preserve functionality**: Never change what the code does - only how it does it. All original features, outputs, and behaviors must remain intact.

# EXECUTION

If you find improvements to make:

1. Make the changes directly on this branch
2. Run tests and type checking to ensure nothing is broken
3. Commit describing the refinements

If the code is already clean and well-structured, do nothing.

# QA COMMENT

Once the review (and any refinement commits) is complete, look at all the commits made on this branch for issue {{TASK_ID}} (use `git log origin/main..HEAD --oneline` to list them, and `git show <sha>` or `git diff origin/main...HEAD` for details).

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
