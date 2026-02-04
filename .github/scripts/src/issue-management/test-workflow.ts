import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Test Workflow Script
 * This script orchestrates the complete test workflow to demonstrate
 * warnings and inactive labels in the same run
 */

interface TestIssue {
  number: number;
  title: string;
}

class LocalTestWorkflow {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private issueNumbers: number[] = [];
  private issuesFilePath: string;

  constructor(token: string, repository: string) {
    this.octokit = new Octokit({ auth: token });
    const [owner, repo] = repository.split('/');
    this.owner = owner;
    this.repo = repo;
    this.issuesFilePath = path.join(process.cwd(), '.test-issues.json');
  }

  /**
   * Display a countdown timer
   */
  private async countdown(seconds: number, message: string): Promise<void> {
    console.log(`\n⏳ ${message}`);
    
    for (let i = seconds; i >= 1; i--) {
      process.stdout.write(`\r   ${i} seconds remaining...   `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    process.stdout.write('\r   ✅ Wait complete!                    \n');
  }

  /**
   * Get the authenticated user's username
   */
  private async getUsername(): Promise<string> {
    const { data } = await this.octokit.users.getAuthenticated();
    return data.login;
  }

  /**
   * Create a single test issue
   */
  private async createIssue(
    title: string,
    body: string,
    labels: string[]
  ): Promise<number> {
    const username = await this.getUsername();
    
    const { data } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      assignees: [username],
      labels,
    });

    console.log(`  ✅ Created issue #${data.number}: ${title}`);
    return data.number;
  }

  /**
   * Save issue numbers to file
   */
  private saveIssueNumbers(): void {
    fs.writeFileSync(
      this.issuesFilePath,
      JSON.stringify(this.issueNumbers, null, 2)
    );
    console.log('\n  💾 Saved issue numbers');
  }

  /**
   * Load issue numbers from file
   */
  private loadIssueNumbers(): void {
    if (fs.existsSync(this.issuesFilePath)) {
      const content = fs.readFileSync(this.issuesFilePath, 'utf8');
      this.issueNumbers = JSON.parse(content);
    }
  }

  /**
   * Clean up old test issues
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up old test issues...');
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
   * Create Batch 1: Issues that should be marked inactive
   */
  private async createBatch1(): Promise<void> {
    console.log('📦 Batch 1: Creating issues that should be MARKED INACTIVE');
    console.log('────────────────────────────────────────────────────');
    
    this.issueNumbers = [];
    
    this.issueNumbers.push(
      await this.createIssue(
        '[TEST-BATCH1] Old issue #1 - should be marked inactive',
        '🧪 Test issue - Batch 1 (oldest)\n\nExpected: Marked inactive\n\n<!-- TEST-ISSUE-MARKER -->',
        ['test', 'batch-1', 'stale-test']
      )
    );
    
    this.issueNumbers.push(
      await this.createIssue(
        '[TEST-BATCH1] Old issue #2 - should be marked inactive',
        '🧪 Test issue - Batch 1 (oldest)\n\nExpected: Marked inactive\n\n<!-- TEST-ISSUE-MARKER -->',
        ['test', 'batch-1', 'stale-test']
      )
    );
    
    this.saveIssueNumbers();
  }

  /**
   * Create Batch 2: Issues that should get warnings
   */
  private async createBatch2(): Promise<void> {
    console.log('📦 Batch 2: Creating issues that should get WARNINGS');
    console.log('───────────────────────────────────────────────────');
    
    this.loadIssueNumbers();
    
    this.issueNumbers.push(
      await this.createIssue(
        '[TEST-BATCH2] Medium issue #1 - should get warning',
        '🧪 Test issue - Batch 2 (middle)\n\nExpected: Warning comment\n\n<!-- TEST-ISSUE-MARKER -->',
        ['test', 'batch-2', 'warning-test']
      )
    );
    
    this.issueNumbers.push(
      await this.createIssue(
        '[TEST-BATCH2] Medium issue #2 - should get warning',
        '🧪 Test issue - Batch 2 (middle)\n\nExpected: Warning comment\n\n<!-- TEST-ISSUE-MARKER -->',
        ['test', 'batch-2', 'warning-test']
      )
    );
    
    this.saveIssueNumbers();
  }

  /**
   * Create Batch 3: Issues that should stay active
   */
  private async createBatch3(): Promise<void> {
    console.log('📦 Batch 3: Creating issues that should stay ACTIVE');
    console.log('──────────────────────────────────────────────────');
    
    this.loadIssueNumbers();
    
    this.issueNumbers.push(
      await this.createIssue(
        '[TEST-BATCH3] New issue #1 - should stay active',
        '🧪 Test issue - Batch 3 (newest)\n\nExpected: No action\n\n<!-- TEST-ISSUE-MARKER -->',
        ['test', 'batch-3', 'active-test']
      )
    );
    
    this.issueNumbers.push(
      await this.createIssue(
        '[TEST-BATCH3] New issue #2 - should stay active',
        '🧪 Test issue - Batch 3 (newest)\n\nExpected: No action\n\n<!-- TEST-ISSUE-MARKER -->',
        ['test', 'batch-3', 'active-test']
      )
    );
    
    this.saveIssueNumbers();
  }

  /**
   * Run the issue management script
   */
  private runScript(): void {
    console.log('🚀 Running the issue management script...');
    console.log('════════════════════════════════════════');
    console.log('');

    execSync('node -r dotenv/config dist/issue-management/check-stale-issues.js dotenv_config_path=.env.test', {
      stdio: 'inherit',
    });
  }

  /**
   * Run the complete test workflow
   */
  async run(): Promise<void> {
    console.log('🧪 Complete Test Workflow');
    console.log('=========================');
    console.log('');
    console.log('This will demonstrate:');
    console.log('  - Issues being marked inactive (oldest)');
    console.log('  - Issues getting warnings (middle age)');
    console.log('  - Issues staying active (newest)');
    console.log('');
    console.log('⏱️  Total time: ~4-5 minutes');
    console.log('');

    const repository = process.env.GITHUB_REPOSITORY || '';
    const warningWeeks = process.env.WARNING_WEEKS || '';
    const inactiveWeeks = process.env.INACTIVE_WEEKS || '';
    const dryRun = process.env.DRY_RUN || '';

    console.log('⚙️  Configuration:');
    console.log(`   Repository: ${repository}`);
    console.log(`   WARNING_WEEKS: ${warningWeeks}`);
    console.log(`   INACTIVE_WEEKS: ${inactiveWeeks}`);
    console.log(`   DRY_RUN: ${dryRun}`);
    console.log('');

    // Clean up old test issues
    await this.cleanup();

    // Batch 1: Create issues that should be marked inactive
    await this.createBatch1();
    await this.countdown(120, 'Waiting 2 minutes for Batch 1 to age...');
    console.log('');

    // Batch 2: Create issues that should get warnings
    await this.createBatch2();
    await this.countdown(120, 'Waiting 2 minutes for Batch 2 to age...');
    console.log('');

    // Batch 3: Create issues that should stay active
    await this.createBatch3();
    console.log('');

    console.log('✅ All test issues created!');
    console.log('');
    console.log('📊 Summary:');
    console.log('  - Batch 1 (2 issues): ~4 minutes old → Should be MARKED INACTIVE (200+ seconds)');
    console.log('  - Batch 2 (2 issues): ~2 minutes old → Should get WARNINGS (40+ seconds)');
    console.log('  - Batch 3 (2 issues): Just created → Should stay ACTIVE (<40 seconds)');
    console.log('');

    // Run the script
    this.runScript();

    console.log('');
    console.log('✅ Test workflow complete!');
    console.log('');
    console.log('🔍 Verify results:');
    console.log(`   https://github.com/${repository}/issues?q=is:issue+label:test`);
    console.log('');
    console.log('🧹 Clean up when done:');
    console.log('   npm run issue-mgmt:test:cleanup');
    console.log('');
  }
}

// Main execution
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!token || !repository) {
  console.error('❌ Error: GITHUB_TOKEN and GITHUB_REPOSITORY must be set');
  console.error('   Please configure .env.test file');
  process.exit(1);
}

const workflow = new LocalTestWorkflow(token, repository);
workflow.run().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

