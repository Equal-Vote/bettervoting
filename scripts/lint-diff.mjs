#!/usr/bin/env node
// Lints only the files that changed vs a base ref, instead of the whole repo.
// Used by CI (node.js.yml) on both the `pull_request` and `push` triggers, so that
// existing lint debt elsewhere in the repo never blocks a PR — only what it touches.
import { execFileSync } from "node:child_process";

const PACKAGES = [
  { dir: "packages/frontend", config: "packages/frontend/eslint.config.js" },
  { dir: "packages/backend", config: "packages/backend/eslint.config.mjs" },
  { dir: "packages/shared", config: "packages/shared/eslint.config.mjs" },
];

const LINTABLE = /\.(js|jsx|ts|tsx)$/;

const base = process.env.LINT_DIFF_BASE || "origin/main";

const changedFiles = execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((f) => LINTABLE.test(f));

if (changedFiles.length === 0) {
  console.log(`No lintable files changed vs ${base}.`);
  process.exit(0);
}

let failed = false;

for (const pkg of PACKAGES) {
  const files = changedFiles.filter((f) => f.startsWith(`${pkg.dir}/`));
  if (files.length === 0) continue;

  console.log(`\nLinting ${files.length} changed file(s) in ${pkg.dir}:`);
  files.forEach((f) => console.log(`  ${f}`));

  try {
    execFileSync("npx", ["eslint", "--config", pkg.config, ...files], {
      stdio: "inherit",
    });
  } catch {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
