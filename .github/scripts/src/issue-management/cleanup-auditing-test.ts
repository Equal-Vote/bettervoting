import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

interface TestResults {
  projectNumber: number;
  projectId: string;
  issues: number[];
}

interface CleanupConfig {
  token: string;
  owner: string;
  repo: string;
}

class AuditingTestCleanup {
  private octokit: Octokit;
  private config: CleanupConfig;

  constructor(config: CleanupConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.config = config;
  }

  /**
   * Load test results from file
   */
  private loadTestResults(): TestResults | null {
    try {
      const data = fs.readFileSync('.test-auditing.json', 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete the test project
   */
  private async deleteProject(projectId: string, projectNumber: number): Promise<void> {
    console.log(`\n🗑️  Deleting test project #${projectNumber}...`);
    
    try {
      const mutation = `
        mutation($projectId: ID!) {
          deleteProjectV2(input: {
            projectId: $projectId
          }) {
            projectV2 {
              id
            }
          }
        }
      `;
      
      await this.octokit.graphql(mutation, {
        projectId: projectId,
      });
      
      console.log(`  ✅ Deleted project #${projectNumber}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Error deleting project:`, message);
    }
  }

  /**
   * Close test issues
   */
  private async closeIssues(issueNumbers: number[]): Promise<void> {
    console.log(`\n🔒 Closing ${issueNumbers.length} test issues...`);
    
    let closed = 0;
    let errors = 0;
    
    for (const issueNumber of issueNumbers) {
      try {
        await this.octokit.issues.update({
          owner: this.config.owner,
          repo: this.config.repo,
          issue_number: issueNumber,
          state: 'closed',
        });
        
        console.log(`  ✅ Closed issue #${issueNumber}`);
        closed++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error closing issue #${issueNumber}:`, message);
        errors++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Issues closed: ${closed}`);
    if (errors > 0) {
      console.log(`  ❌ Errors: ${errors}`);
    }
  }

  /**
   * Remove the test results file
   */
  private removeTestResultsFile(): void {
    try {
      fs.unlinkSync('.test-auditing.json');
      console.log(`\n🗑️  Removed .test-auditing.json`);
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  /**
   * Run the cleanup
   */
  async run(): Promise<void> {
    console.log(`🧹 Cleaning Up Auditing Test`);
    console.log(`════════════════════════════════════════`);
    console.log(`Repository: ${this.config.owner}/${this.config.repo}\n`);
    
    // Load test results
    const testResults = this.loadTestResults();
    
    if (!testResults) {
      console.log(`⚠️  No test results file found (.test-auditing.json)`);
      console.log(`   Nothing to clean up.`);
      return;
    }
    
    console.log(`📂 Found test results:`);
    console.log(`  - Project #${testResults.projectNumber}`);
    console.log(`  - ${testResults.issues.length} issues`);
    
    // Delete project
    if (testResults.projectId) {
      await this.deleteProject(testResults.projectId, testResults.projectNumber);
    }
    
    // Close issues
    if (testResults.issues.length > 0) {
      await this.closeIssues(testResults.issues);
    }
    
    // Remove test results file
    this.removeTestResultsFile();
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`\n💡 Note: Issues are closed but not deleted (GitHub doesn't allow deletion via API)`);
    console.log(`   You can manually delete them from the GitHub UI if needed.`);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY environment variable is required');
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY must be in format "owner/repo"');
  }

  const config: CleanupConfig = {
    token,
    owner,
    repo,
  };

  const cleanup = new AuditingTestCleanup(config);
  await cleanup.run();
}

if (require.main === module) {
  main();
}
