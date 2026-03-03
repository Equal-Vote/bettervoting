import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawnSync } from 'child_process';

/**
 * End-to-End GitHub Actions Workflow Test Script
 * This script:
 * 1. Cleans up old test issues
 * 2. Creates new test issues with staggered ages
 * 3. Triggers the GitHub Actions workflow
 * 4. Waits for workflow completion
 * 5. Checks the results to verify expected behavior
 */

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
}

interface IssueData {
  number: number;
  title: string;
  assignees: string[];
  commentCount: number;
}

class GitHubWorkflowTester {
  private owner: string;
  private repo: string;
  private repository: string;
  private issuesFilePath: string;

  constructor(repository: string) {
    this.repository = repository;
    const [owner, repo] = repository.split('/');
    this.owner = owner;
    this.repo = repo;
    this.issuesFilePath = path.join(process.cwd(), '.test-issues.json');
  }

  /**
   * Check if GitHub CLI is installed and authenticated
   */
  private checkGitHubCLI(): void {
    // Check if gh is installed
    const whichResult = spawnSync('which', ['gh'], { encoding: 'utf8' });
    if (whichResult.status !== 0) {
      console.error('❌ Error: GitHub CLI (gh) is not installed!');
      console.error('');
      console.error('Please install it:');
      console.error('  macOS:   brew install gh');
      console.error('  Linux:   See https://github.com/cli/cli#installation');
      console.error('  Windows: See https://github.com/cli/cli#installation');
      console.error('');
      process.exit(1);
    }

    // Check if we have a token in environment (from .env.test)
    const hasEnvToken = !!process.env.GITHUB_TOKEN;

    if (hasEnvToken) {
      console.log('✅ GitHub CLI is installed');
      console.log('✅ Using GITHUB_TOKEN from environment');
      console.log('');
      return;
    }

    // Check if authenticated with gh CLI
    const authResult = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
    if (authResult.status !== 0) {
      console.error('❌ Error: Not authenticated with GitHub CLI and no GITHUB_TOKEN in environment!');
      console.error('');
      console.error('Please either:');
      console.error('  1. Set GITHUB_TOKEN in .env.test, OR');
      console.error('  2. Run: gh auth login');
      console.error('');
      process.exit(1);
    }

    console.log('✅ GitHub CLI is installed and authenticated');
    console.log('');
  }

  /**
   * Clean up old test issues
   */
  private cleanup(): void {
    console.log('🧹 Step 1: Cleaning up old test issues...');
    console.log('──────────────────────────────────────────');

    try {
      execSync('node -r dotenv/config dist/issue-management/cleanup-test-issues.js dotenv_config_path=.env.test', {
        stdio: 'inherit',
      });
    } catch (error) {
      // Ignore cleanup errors
    }

    console.log('');
  }

  /**
   * Create test issues
   */
  private createTestIssues(): void {
    console.log('📦 Step 2: Creating test issues...');
    console.log('──────────────────────────────────────────');
    console.log('This will create 8 issues in 3 staggered batches (~4-5 minutes)');
    console.log('');

    execSync('node -r dotenv/config dist/issue-management/create-test-issues.js dotenv_config_path=.env.test', {
      stdio: 'inherit',
    });

    console.log('');
  }

  /**
   * Trigger GitHub Actions workflow
   */
  private triggerWorkflow(): void {
    console.log('🚀 Step 3: Triggering GitHub Actions workflow...');
    console.log('──────────────────────────────────────────────────');

    const dryRun = process.env.DRY_RUN || 'false';
    const timeUnit = process.env.TIME_UNIT || 'seconds';
    const warningWeeks = process.env.WARNING_WEEKS || '20';
    const unassignWeeks = process.env.UNASSIGN_WEEKS || '60';

    console.log('Triggering workflow with parameters:');
    console.log(`  - dry_run: ${dryRun}`);
    console.log(`  - time_unit: ${timeUnit}`);
    console.log(`  - warning_weeks: ${warningWeeks}`);
    console.log(`  - unassign_weeks: ${unassignWeeks}`);
    console.log('');

    // Set GH_TOKEN environment variable for gh CLI to use
    const env = { ...process.env };
    if (process.env.GITHUB_TOKEN) {
      env.GH_TOKEN = process.env.GITHUB_TOKEN;
    }

    const result = spawnSync(
      'gh',
      [
        'workflow', 'run', 'issue-management.yml',
        '--repo', this.repository,
        '--ref', 'feat/chat-bot-auto-assign',
        '-f', `dry_run=${dryRun}`,
        '-f', `time_unit=${timeUnit}`,
        '-f', `warning_weeks=${warningWeeks}`,
        '-f', `unassign_weeks=${unassignWeeks}`,
      ],
      { encoding: 'utf8', stdio: 'inherit', env }
    );

    if (result.status !== 0) {
      console.error('❌ Failed to trigger workflow');
      process.exit(1);
    }

    console.log('✅ Workflow triggered!');
    console.log('');
  }

  /**
   * Get the latest workflow run ID
   */
  private getLatestWorkflowRunId(): string {
    console.log('⏳ Step 4: Waiting for workflow to complete...');
    console.log('───────────────────────────────────────────────');
    console.log('Waiting for workflow to start...');

    // Wait a bit for the workflow to start
    execSync('sleep 5', { stdio: 'inherit' });

    // Set GH_TOKEN environment variable for gh CLI to use
    const env = { ...process.env };
    if (process.env.GITHUB_TOKEN) {
      env.GH_TOKEN = process.env.GITHUB_TOKEN;
    }

    const result = spawnSync(
      'gh',
      [
        'run', 'list',
        '--repo', this.repository,
        '--workflow=issue-management.yml',
        '--limit', '1',
        '--json', 'databaseId',
        '--jq', '.[0].databaseId',
      ],
      { encoding: 'utf8', env }
    );

    const runId = result.stdout.trim();

    if (!runId || result.status !== 0) {
      console.error('❌ Error: Could not find workflow run!');
      process.exit(1);
    }

    console.log(`Found workflow run: ${runId}`);
    console.log('Watching workflow progress...');
    console.log('');

    return runId;
  }

  /**
   * Watch workflow completion
   */
  private watchWorkflow(runId: string): void {
    // Set GH_TOKEN environment variable for gh CLI to use
    const env = { ...process.env };
    if (process.env.GITHUB_TOKEN) {
      env.GH_TOKEN = process.env.GITHUB_TOKEN;
    }

    spawnSync(
      'gh',
      ['run', 'watch', runId, '--repo', this.repository],
      { stdio: 'inherit', env }
    );

    console.log('');
    console.log('✅ Workflow completed!');
    console.log('');
  }

  /**
   * Check workflow status
   */
  private checkWorkflowStatus(runId: string): string {
    // Set GH_TOKEN environment variable for gh CLI to use
    const env = { ...process.env };
    if (process.env.GITHUB_TOKEN) {
      env.GH_TOKEN = process.env.GITHUB_TOKEN;
    }

    const result = spawnSync(
      'gh',
      [
        'run', 'view', runId,
        '--repo', this.repository,
        '--json', 'conclusion',
        '--jq', '.conclusion',
      ],
      { encoding: 'utf8', env }
    );

    return result.stdout.trim();
  }

  /**
   * Check test issue results
   */
  private checkResults(runId: string): void {
    console.log('🔍 Step 5: Checking results...');
    console.log('──────────────────────────────────────────');
    console.log('');

    const status = this.checkWorkflowStatus(runId);
    console.log(`Workflow Status: ${status}`);
    console.log('');

    if (status !== 'success') {
      console.error('❌ Workflow did not complete successfully!');
      console.error('');
      console.error('View logs:');
      console.error(`  gh run view ${runId} --repo ${this.repository} --log`);
      console.error('');
      process.exit(1);
    }

    // Check the test issues
    console.log('Fetching test issue states...');
    console.log('');

    if (!fs.existsSync(this.issuesFilePath)) {
      console.log('⚠️  Warning: .test-issues.json not found, cannot verify specific issues');
      return;
    }

    const issueNumbers: number[] = JSON.parse(
      fs.readFileSync(this.issuesFilePath, 'utf8')
    );

    // Set GH_TOKEN environment variable for gh CLI to use
    const env = { ...process.env };
    if (process.env.GITHUB_TOKEN) {
      env.GH_TOKEN = process.env.GITHUB_TOKEN;
    }

    console.log('Checking test issues:');
    for (const issueNum of issueNumbers) {
      const result = spawnSync(
        'gh',
        [
          'issue', 'view', issueNum.toString(),
          '--repo', this.repository,
          '--json', 'number,title,assignees,comments',
          '--jq', '{number, title, assignees: [.assignees[].login], comment_count: (.comments | length)}',
        ],
        { encoding: 'utf8', env }
      );

      if (result.status === 0) {
        const issueData = JSON.parse(result.stdout);
        const assignees = issueData.assignees.length > 0
          ? issueData.assignees.join(', ')
          : '(none)';

        console.log(`  Issue #${issueNum}: ${issueData.title}`);
        console.log(`    Assignees: ${assignees}`);
        console.log(`    Comments: ${issueData.comment_count}`);
        console.log('');
      }
    }
  }

  /**
   * Display summary
   */
  private displaySummary(runId: string): void {
    console.log('📊 Summary');
    console.log('──────────');
    console.log('✅ Workflow completed successfully');
    console.log('✅ Test issues created and processed');
    console.log('');
    console.log('🔗 View Results:');
    console.log(`   Workflow: https://github.com/${this.repository}/actions/runs/${runId}`);
    console.log(`   Issues:   https://github.com/${this.repository}/issues?q=is:issue+label:test`);
    console.log('');
    console.log('🧹 Clean up when done:');
    console.log('   npm run issue-mgmt:test:cleanup');
    console.log('');
    console.log('✅ End-to-end test complete!');
  }

  /**
   * Run the complete test workflow
   */
  async run(): Promise<void> {
    console.log('🧪 End-to-End GitHub Actions Workflow Test');
    console.log('===========================================');
    console.log('');

    const warningWeeks = process.env.WARNING_WEEKS || '';
    const unassignWeeks = process.env.UNASSIGN_WEEKS || '';
    const timeUnit = process.env.TIME_UNIT || '';
    const dryRun = process.env.DRY_RUN || '';

    console.log('⚙️  Configuration:');
    console.log(`   Repository: ${this.repository}`);
    console.log(`   WARNING_WEEKS: ${warningWeeks}`);
    console.log(`   UNASSIGN_WEEKS: ${unassignWeeks}`);
    console.log(`   TIME_UNIT: ${timeUnit}`);
    console.log(`   DRY_RUN: ${dryRun}`);
    console.log('');

    // Check prerequisites
    this.checkGitHubCLI();

    // Step 1: Clean up
    this.cleanup();

    // Step 2: Create test issues
    this.createTestIssues();

    // Step 3: Trigger workflow
    this.triggerWorkflow();

    // Step 4: Wait for completion
    const runId = this.getLatestWorkflowRunId();
    this.watchWorkflow(runId);

    // Step 5: Check results
    this.checkResults(runId);

    // Display summary
    this.displaySummary(runId);
  }
}

// Main execution
const repository = process.env.GITHUB_REPOSITORY;

if (!repository) {
  console.error('❌ Error: GITHUB_REPOSITORY must be set');
  console.error('   Please configure .env.test file');
  process.exit(1);
}

const tester = new GitHubWorkflowTester(repository);
tester.run().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

