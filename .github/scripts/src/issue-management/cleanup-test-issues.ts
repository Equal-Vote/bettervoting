import 'dotenv/config';
import { Octokit } from '@octokit/rest';

class TestIssueCleanup {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, repository: string) {
    this.octokit = new Octokit({ auth: token });
    const [owner, repo] = repository.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Load issue numbers from saved file
   */
  private loadIssueNumbers(): number[] {
    const fs = require('fs');
    
    if (!fs.existsSync('.test-issues.json')) {
      console.log('ℹ️  No .test-issues.json file found');
      return [];
    }

    const data = fs.readFileSync('.test-issues.json', 'utf8');
    return JSON.parse(data);
  }

  /**
   * Find all test issues by label
   */
  private async findTestIssues(): Promise<number[]> {
    console.log('🔍 Searching for test issues with label "test"...');
    
    const issues: number[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        labels: 'test',
        state: 'all', // Include both open and closed
        per_page: 100,
        page: page,
      });

      if (data.length === 0) break;

      // Filter for issues with TEST-ISSUE-MARKER in body
      const testIssues = data.filter(issue => 
        issue.body?.includes('TEST-ISSUE-MARKER')
      );

      issues.push(...testIssues.map(i => i.number));
      
      if (data.length < 100) break;
      page++;
    }

    console.log(`  Found ${issues.length} test issues`);
    return issues;
  }



  /**
   * Clean up all test issues
   */
  async cleanup(mode: 'saved' | 'all' | 'both' = 'both'): Promise<void> {
    console.log('🧹 Cleaning Up Test Issues');
    console.log('==========================\n');
    console.log(`Repository: ${this.owner}/${this.repo}\n`);
    console.log(`Mode: ${mode}\n`);

    let issuesToDelete: number[] = [];

    if (mode === 'saved' || mode === 'both') {
      console.log('📂 Checking .test-issues.json...');
      const savedIssues = this.loadIssueNumbers();
      console.log(`   Found ${savedIssues.length} issues: ${JSON.stringify(savedIssues)}`);
      if (savedIssues.length > 0) {
        console.log(`📋 Found ${savedIssues.length} issues in .test-issues.json`);
        issuesToDelete.push(...savedIssues);
      }
    }

    if (mode === 'all' || mode === 'both') {
      console.log('🔍 Searching GitHub for test issues...');
      const foundIssues = await this.findTestIssues();
      console.log(`   Found ${foundIssues.length} issues: ${JSON.stringify(foundIssues)}`);
      issuesToDelete.push(...foundIssues);
    }

    // Remove duplicates
    issuesToDelete = [...new Set(issuesToDelete)];
    console.log(`\n📊 Total unique issues to delete: ${issuesToDelete.length}`);

    if (issuesToDelete.length === 0) {
      console.log('\n✅ No test issues found to clean up!');
      return;
    }

    console.log(`\n🗑️  Processing ${issuesToDelete.length} test issues...\n`);

    // Fetch all issue states in parallel
    console.log('📥 Fetching issue states...');
    const issueStates = await Promise.all(
      issuesToDelete.map(async (issueNumber) => {
        try {
          const { data } = await this.octokit.issues.get({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
          });
          return { number: issueNumber, state: data.state, error: false };
        } catch (error: any) {
          console.error(`  ❌ Failed to fetch issue #${issueNumber}: ${error.message}`);
          return { number: issueNumber, state: 'unknown', error: true };
        }
      })
    );

    // Filter to only open issues
    const openIssues = issueStates.filter(issue => issue.state === 'open');
    const alreadyClosed = issueStates.filter(issue => issue.state === 'closed');
    const errorIssues = issueStates.filter(issue => issue.error);

    console.log(`  Found ${openIssues.length} open, ${alreadyClosed.length} already closed, ${errorIssues.length} errors\n`);

    if (alreadyClosed.length > 0) {
      console.log('⏭️  Skipping already closed issues:', alreadyClosed.map(i => `#${i.number}`).join(', '));
    }

    if (openIssues.length === 0) {
      console.log('\n✅ No open issues to close!');
    } else {
      console.log(`\n🔒 Closing ${openIssues.length} open issues in parallel...\n`);

      // Close all open issues in parallel
      const closeResults = await Promise.all(
        openIssues.map(async (issue) => {
          try {
            // Close the issue
            await this.octokit.issues.update({
              owner: this.owner,
              repo: this.repo,
              issue_number: issue.number,
              state: 'closed',
            });

            // Add a comment explaining the closure
            await this.octokit.issues.createComment({
              owner: this.owner,
              repo: this.repo,
              issue_number: issue.number,
              body: '🧹 **Test Cleanup**\n\nThis test issue is being closed and cleaned up.',
            });

            console.log(`  ✅ Closed issue #${issue.number}`);
            return { success: true, number: issue.number };
          } catch (error: any) {
            console.error(`  ❌ Failed to close issue #${issue.number}: ${error.message}`);
            return { success: false, number: issue.number };
          }
        })
      );

      const successCount = closeResults.filter(r => r.success).length;
      const failCount = closeResults.filter(r => !r.success).length;

      console.log('\n✅ Cleanup complete!');
      console.log(`  - Issues closed: ${successCount}`);
      if (alreadyClosed.length > 0) {
        console.log(`  - Issues skipped (already closed): ${alreadyClosed.length}`);
      }
      if (failCount > 0) {
        console.log(`  - Errors: ${failCount}`);
      }
    }

    // Clean up the saved file
    const fs = require('fs');
    if (fs.existsSync('.test-issues.json')) {
      fs.unlinkSync('.test-issues.json');
      console.log('  - Removed .test-issues.json');
    }

    console.log('\n💡 Note: Issues are closed but not deleted (GitHub doesn\'t allow deletion via API)');
    console.log('   You can manually delete them from the GitHub UI if needed.');
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

    // Check for command line argument (filter out dotenv args)
    const args = process.argv.slice(2).filter(arg => !arg.startsWith('dotenv_config'));
    const mode = args[0] as 'saved' | 'all' | 'both' | undefined;

    const cleanup = new TestIssueCleanup(token, repository);
    await cleanup.cleanup(mode || 'both');

    console.log('\n✅ Cleanup script completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

