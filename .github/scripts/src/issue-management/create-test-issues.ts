import 'dotenv/config';
import { Octokit } from '@octokit/rest';

interface TestIssue {
  title: string;
  body: string;
  assignees: string[];
  labels: string[];
  delayMinutes: number; // How long to wait after creating this issue
}

interface CreatedIssue {
  number: number;
  title: string;
  html_url: string;
  createdAt: Date;
}

class StaggeredTestIssueCreator {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private createdIssues: CreatedIssue[] = [];

  constructor(token: string, repository: string) {
    this.octokit = new Octokit({ auth: token });
    const [owner, repo] = repository.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Get the authenticated user's username
   */
  private async getUsername(): Promise<string> {
    const { data } = await this.octokit.users.getAuthenticated();
    return data.login;
  }

  /**
   * Sleep for specified minutes
   */
  private async sleep(minutes: number): Promise<void> {
    const ms = minutes * 60 * 1000;
    console.log(`\n⏳ Waiting ${minutes} minute(s)...`);
    
    // Show countdown
    const startTime = Date.now();
    const endTime = startTime + ms;
    
    while (Date.now() < endTime) {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      process.stdout.write(`\r   ${remaining} seconds remaining...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\r   ✅ Wait complete!                    \n');
  }

  /**
   * Generate test issue templates with staggered delays
   */
  private async generateTestIssues(username: string): Promise<TestIssue[]> {
    return [
      // Batch 1: Issues that should be MARKED INACTIVE (created first, oldest)
      {
        title: '[TEST] Very stale issue - should be marked inactive',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created FIRST and should be the oldest.
With WARNING_WEEKS=0 and INACTIVE_WEEKS=1, this should be **marked inactive**.

Batch: 1 (oldest)
Expected action: Apply "2 weeks inactive" label

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'stale-test', 'batch-1'],
        delayMinutes: 0, // No delay after this one
      },
      {
        title: '[TEST] Stale issue #2 - should be marked inactive',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created in the first batch (oldest).
With WARNING_WEEKS=0 and INACTIVE_WEEKS=1, this should be **marked inactive**.

Batch: 1 (oldest)
Expected action: Apply "2 weeks inactive" label

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'stale-test', 'batch-1'],
        delayMinutes: 0, // No delay after this one
      },
      {
        title: '[TEST] Stale issue #3 - should be marked inactive',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created in the first batch (oldest).
With WARNING_WEEKS=0 and INACTIVE_WEEKS=1, this should be **marked inactive**.

Batch: 1 (oldest)
Expected action: Apply "2 weeks inactive" label

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'stale-test', 'batch-1'],
        delayMinutes: 2, // WAIT 2 MINUTES before next batch
      },

      // Batch 2: Issues that should get WARNINGS (created after delay, middle age)
      {
        title: '[TEST] Warning issue #1 - should get warning',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created in the SECOND batch (middle age).
With WARNING_WEEKS=0 and INACTIVE_WEEKS=1, this should get a **warning comment**.

Batch: 2 (middle)
Expected action: Warning comment + "To Update !" label

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'warning-test', 'batch-2'],
        delayMinutes: 0,
      },
      {
        title: '[TEST] Warning issue #2 - should get warning',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created in the SECOND batch (middle age).
With WARNING_WEEKS=0 and INACTIVE_WEEKS=1, this should get a **warning comment**.

Batch: 2 (middle)
Expected action: Warning comment + "To Update !" label

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'warning-test', 'batch-2'],
        delayMinutes: 2, // WAIT 2 MINUTES before next batch
      },

      // Batch 3: Issues that should be ACTIVE (created last, newest)
      {
        title: '[TEST] Active issue #1 - no action',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created in the THIRD batch (newest).
This should have **no action** taken.

Batch: 3 (newest)
Expected action: None (still active)

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'active-test', 'batch-3'],
        delayMinutes: 0,
      },
      {
        title: '[TEST] Active issue #2 - no action',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created in the THIRD batch (newest).
This should have **no action** taken.

Batch: 3 (newest)
Expected action: None (still active)

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'active-test', 'batch-3'],
        delayMinutes: 0,
      },
      {
        title: '[TEST] Active issue #3 - no action',
        body: `🧪 **This is a test issue created by the staggered test script**

This issue was created in the THIRD batch (newest).
This should have **no action** taken.

Batch: 3 (newest)
Expected action: None (still active)

<!-- TEST-ISSUE-MARKER -->`,
        assignees: [username],
        labels: ['test', 'active-test', 'batch-3'],
        delayMinutes: 0,
      },
    ];
  }

  /**
   * Create a single test issue
   */
  private async createIssue(issue: TestIssue): Promise<CreatedIssue> {
    console.log(`Creating: ${issue.title}`);
    
    const { data } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: issue.title,
      body: issue.body,
      assignees: issue.assignees,
      labels: issue.labels,
    });

    const created = {
      number: data.number,
      title: data.title,
      html_url: data.html_url,
      createdAt: new Date(),
    };

    console.log(`  ✅ Created issue #${data.number}`);
    
    return created;
  }

  /**
   * Create all test issues with staggered delays
   */
  async createTestIssues(): Promise<void> {
    console.log('🧪 Creating Staggered Test Issues');
    console.log('==================================\n');
    console.log(`Repository: ${this.owner}/${this.repo}\n`);

    const username = await this.getUsername();
    console.log(`Authenticated as: ${username}\n`);

    const testIssues = await this.generateTestIssues(username);
    
    console.log(`Creating ${testIssues.length} test issues in 3 batches...\n`);
    console.log('⏱️  Timeline:');
    console.log('  - Batch 1 (3 issues): Created first → Should be MARKED INACTIVE');
    console.log('  - Wait 2 minutes');
    console.log('  - Batch 2 (2 issues): Created second → Should get WARNINGS');
    console.log('  - Wait 2 minutes');
    console.log('  - Batch 3 (3 issues): Created last → Should be ACTIVE (no action)');
    console.log('\n⚠️  Total time: ~4-5 minutes\n');

    let batchNumber = 1;
    for (let i = 0; i < testIssues.length; i++) {
      const issue = testIssues[i];
      
      // Detect batch changes
      if (i === 3) {
        console.log('\n📦 Batch 2 (Middle age - should get warnings)');
        console.log('─────────────────────────────────────────────\n');
        batchNumber = 2;
      } else if (i === 5) {
        console.log('\n📦 Batch 3 (Newest - should be active)');
        console.log('───────────────────────────────────────\n');
        batchNumber = 3;
      } else if (i === 0) {
        console.log('📦 Batch 1 (Oldest - should be marked inactive)');
        console.log('──────────────────────────────────────────\n');
      }

      const created = await this.createIssue(issue);
      this.createdIssues.push(created);
      
      // Small delay between individual issues
      await new Promise(resolve => setTimeout(resolve, 500));

      // Wait if specified
      if (issue.delayMinutes > 0) {
        await this.sleep(issue.delayMinutes);
      }
    }

    console.log('\n✅ All test issues created!\n');
    console.log('📊 Summary:');
    console.log(`  - Total issues: ${this.createdIssues.length}`);
    console.log(`  - Batch 1 (oldest): 3 issues → Should be marked inactive`);
    console.log(`  - Batch 2 (middle): 2 issues → Should get warnings`);
    console.log(`  - Batch 3 (newest): 3 issues → Should stay active`);
    
    console.log('\n🔗 Created Issues:');
    this.createdIssues.forEach((issue, idx) => {
      const batch = idx < 3 ? '1' : idx < 5 ? '2' : '3';
      console.log(`  [Batch ${batch}] #${issue.number}: ${issue.title}`);
      console.log(`           ${issue.html_url}`);
    });

    console.log('\n💡 Next Steps:');
    console.log('  1. Run: npm run test:run');
    console.log('  2. Check GitHub to see the results');
    console.log('  3. You should see:');
    console.log('     - 3 issues marked inactive (Batch 1)');
    console.log('     - 2 issues with warning comments (Batch 2)');
    console.log('     - 3 issues unchanged (Batch 3)');
    console.log('  4. Clean up: npm run test:cleanup');
  }

  /**
   * Save created issue numbers to a file for cleanup
   */
  async saveIssueNumbers(): Promise<void> {
    const fs = require('fs');
    const issueNumbers = this.createdIssues.map(i => i.number);
    fs.writeFileSync('.test-issues.json', JSON.stringify(issueNumbers, null, 2));
    console.log('\n💾 Saved issue numbers to .test-issues.json for cleanup');
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    if (!repository) {
      throw new Error('GITHUB_REPOSITORY environment variable is required');
    }

    console.log('⚙️  Configuration:');
    console.log(`   WARNING_WEEKS: ${process.env.WARNING_WEEKS || '1'}`);
    console.log(`   INACTIVE_WEEKS: ${process.env.INACTIVE_WEEKS || '2'}`);
    console.log(`   DRY_RUN: ${process.env.DRY_RUN || 'false'}\n`);

    const creator = new StaggeredTestIssueCreator(token, repository);
    await creator.createTestIssues();
    await creator.saveIssueNumbers();

    console.log('\n✅ Staggered test setup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

