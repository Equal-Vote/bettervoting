# Diff-scoped lint and secret-scan enforcement, not whole-repo

A prior attempt to roll out ESLint across the whole codebase turned into a massive
overhaul project and stalled. To add real, blocking lint and secret-scan checks
without repeating that, both are scoped to only what changed rather than the whole
repo: `lint-staged` checks staged files in the Husky pre-commit hook, and `npm run
lint:diff` / gitleaks check the PR's (or push's) diff in CI. Neither ever looks at
pre-existing files outside that diff, so existing lint/secret debt elsewhere in the
repo can never block a commit or PR — only newly touched code is held to the
standard, and the codebase converges toward compliance gradually as files get
touched. Both checks are blocking (required) precisely because they're scoped this
way; a future engineer might otherwise wonder why CI doesn't just lint everything
given configs exist for every package.
