# Husky hooks are on by default, split across pre-commit and pre-push

Husky hooks (`prepare` in `package.json`) activate automatically for every
contributor on `npm install`. In practice, uniform enforcement was judged more valuable than that per-person
control — a check contributors can silently skip only helps the contributors
who remember to turn it on.

The checks are split by cost, not bundled into one hook:

- **`pre-commit`** — `lint-staged` only (the files being committed, not the
  whole repo). Cheap enough to run on every commit.
- **`pre-push`** — `npm run build -ws` and `npm test`. These cost real time,
  so they run once per push rather than once per commit.
- **E2E tests are deliberately left out of both hooks.** They spin up the
  full docker-compose stack, which is too slow to run locally on every commit
  or push. CI already runs them on every PR.
- **`gitleaks` is CI-only, not in any local hook** (see ADR-0001) — making it
  a default-on hook would require every contributor to install the `gitleaks`
  binary locally just to commit at all, for a check CI already runs as a
  blocking step on every PR and push.
