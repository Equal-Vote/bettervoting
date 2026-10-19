// Parallel Planner with Review — four-phase orchestration loop
//
// This template drives a multi-phase workflow:
//   Phase 1 (Plan):             A sonnet agent analyzes open issues, builds a
//                               dependency graph, and outputs a <plan> JSON
//                               listing unblocked issues with branch names.
//   Phase 2 (Execute + Review): For each issue, a sandbox is created via
//                               createSandbox(). The implementer runs first
//                               (100 iterations). If it produces commits, a
//                               reviewer runs in the same sandbox on the same
//                               branch (1 iteration). All issue pipelines
//                               run concurrently via Promise.allSettled().
//   Phase 3 (Stack):            A single agent rebases each completed branch
//                               onto the previous one, building a stack of
//                               branches (one future PR each) on top of the
//                               branch the run started from.
//   Phase 4 (QA Issue):         After all cycles, one agent creates a single
//                               GitHub issue covering the whole stack, with
//                               manual QA steps for the human reviewer.
//
// The outer loop repeats up to MAX_ITERATIONS times so that newly unblocked
// issues are picked up after each round, building on the top of the stack.
//
// Nothing is pushed. Once QA passes, the human submits the stack as draft PRs
// with `gh stack submit`.
//
// Usage:
//   npx tsx .sandcastle/main.mts [--noqa]
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.mts" }
//
// Flags:
//   --noqa   Skip Phase 4 (QA issue creation)

import { execFileSync } from "node:child_process";
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { z } from "zod";

// The planner emits its plan as JSON inside <plan> tags; Output.object extracts
// and validates it against this schema. We use Zod here, but any Standard
// Schema validator works just as well — Valibot, ArkType, etc. See
// https://standardschema.dev.
const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string() }),
  ),
});

const stackSchema = z.object({
  branches: z.array(z.string()),
});

const qaIssueSchema = z.object({
  id: z.string(),
  url: z.string(),
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const noqa = process.argv.includes("--noqa");

// Maximum number of plan→execute→merge cycles before stopping.
// Raise this if your backlog is large; lower it for a quick smoke-test run.
const MAX_ITERATIONS = 10;

// Hooks run inside the sandbox before the agent starts each iteration.
// npm install ensures the sandbox always has fresh dependencies.
const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install" }] },
};

// Copy node_modules from the host into the worktree before each sandbox
// starts. Avoids a full npm install from scratch; the hook above handles
// platform-specific binaries and any packages added since the last copy.
// NOTE: the bettervoting node_modules folder times out, possibly due to size, or due to complexity with npm workspaces, instead we just do a fresh install in the git worktree
const copyToWorktree: string[] = [];// ["node_modules"];

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

// The stack is built on top of whatever branch the run starts from.
const baseBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
  encoding: "utf8",
}).trim();

// Branches stacked so far, bottom to top. Each one becomes its own PR.
const stack: string[] = [];

const formatList = (items: string[]) =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "(empty)";

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // The planning agent (opus, for deeper reasoning) reads the open issue list,
  // builds a dependency graph, and selects the issues that can be worked in
  // parallel right now (i.e., no blocking dependencies on other open issues).
  //
  // It outputs a <plan> JSON block — Output.object parses and validates it.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "planner",
    // One iteration is enough: the planner just needs to read and reason,
    // not write code. (Structured output requires maxIterations: 1.)
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-sonnet-4-6"),
    promptFile: "./.sandcastle/plan-prompt.md",
    // Extract and validate the <plan> JSON into a typed object. Throws
    // StructuredOutputError if the tag is missing, the JSON is malformed, or
    // validation fails — which aborts the loop.
    output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
  });

  const issues = plan.output.issues;

  if (issues.length === 0) {
    // No unblocked work — either everything is done or everything is blocked.
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Execute + Review
  //
  // For each issue, create a sandbox via createSandbox() so the implementer
  // and reviewer share the same sandbox instance per branch. The implementer
  // runs first; if it produces commits, the reviewer runs in the same sandbox.
  //
  // Promise.allSettled means one failing pipeline doesn't cancel the others.
  // -------------------------------------------------------------------------

  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: docker(),
        hooks,
        copyToWorktree,
      });

      try {
        // Run the implementer
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.claudeCode("claude-sonnet-4-6"),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
        });

        // Only review if the implementer produced commits
        if (implement.commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.claudeCode("claude-opus-4-7"),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
            },
          });

          // Merge commits from both runs so the merge phase sees all of them.
          // Each sandbox.run() only returns commits from its own run.
          return {
            ...review,
            commits: [...implement.commits, ...review.commits],
          };
        }

        return implement;
      } finally {
        await sandbox.close();
      }
    }),
  );

  // Log any agents that threw (network error, sandbox crash, etc.).
  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ ${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  // Only pass branches that actually produced commits to the merge phase.
  // An agent that ran successfully but made no commits has nothing to merge.
  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i]! }))
    .filter(
      (entry) =>
        entry.outcome.status === "fulfilled" &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(
    `\nExecution complete. ${completedBranches.length} branch(es) with commits:`,
  );
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    // All agents ran but none made commits — nothing to merge this cycle.
    console.log("No commits produced. Nothing to merge.");
    //continue;
    break; // for now we'll break since this usually means we're done
  }

  // -------------------------------------------------------------------------
  // Phase 3: Stack
  //
  // One agent rebases each completed branch onto the previous one, resolving
  // any conflicts and running tests, so each branch holds only its own
  // issue's changes. It leaves the top of the stack checked out so the next
  // iteration's branches build on it.
  // -------------------------------------------------------------------------
  const stacked = await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "stacker",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-7"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BASE_BRANCH: baseBranch,
      STACK: formatList(stack),
      BRANCHES: formatList(completedBranches),
      ISSUES: formatList(completedIssues.map((i) => `${i.id}: ${i.title}`)),
    },
    output: sandcastle.Output.object({ tag: "stack", schema: stackSchema }),
  });

  stack.push(...stacked.output.branches);

  console.log(`\nStack (bottom to top, on ${baseBranch}):`);
  for (const branch of stack) {
    console.log(`  ${branch}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 4: QA Issue
//
// After all cycles complete, one agent inspects the whole stack and creates a
// single GitHub issue summarising what each branch adds, with manual QA steps
// for the human reviewer to walk through before submitting the stack.
// ---------------------------------------------------------------------------
if (stack.length === 0) {
  console.log("\nNothing was stacked. All done.");
} else {
  if (noqa) {
    console.log("\nSkipping QA issue (--noqa).");
  } else {
    console.log("\n=== Creating QA issue ===\n");

    const qaIssue = await sandcastle.run({
      hooks,
      sandbox: docker(),
      name: "qa-issue",
      maxIterations: 1,
      agent: sandcastle.claudeCode("claude-sonnet-4-6"),
      promptFile: "./.sandcastle/qa-issue-prompt.md",
      promptArgs: {
        BASE_BRANCH: baseBranch,
        STACK: formatList(stack),
      },
      output: sandcastle.Output.object({
        tag: "qa-issue",
        schema: qaIssueSchema,
      }),
    });

    console.log(`\nWalk through the QA issue:`);
    console.log(`  ${qaIssue.output.url}`);
  }

  console.log(`\nThen submit the stack as draft PRs (one per branch), e.g. with`);
  console.log(`the /submit-stack skill in Claude Code:`);
  console.log(`  base: ${baseBranch}`);
  console.log(`  stack (bottom to top): ${stack.join(" ")}`);
}
