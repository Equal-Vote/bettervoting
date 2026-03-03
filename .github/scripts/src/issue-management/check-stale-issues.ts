import 'dotenv/config';
import { Octokit } from '@octokit/rest';

interface IssueData {
  number: number;
  title: string;
  assignees: Array<{ login: string }>;
  updated_at: string;
  created_at: string;
  html_url: string;
}

interface Config {
  owner: string;
  repo: string;
  warningWeeks: number;
  unassignWeeks: number;
  dryRun: boolean;
  timeUnit: 'weeks' | 'minutes' | 'seconds';
}

class StaleIssueManager {
  private octokit: Octokit;
  private config: Config;

  constructor(token: string, config: Config) {
    this.octokit = new Octokit({ auth: token });
    this.config = config;
  }

  /**
   * Calculate the time since a given date in the configured unit
   * Returns precise decimal value (not rounded)
   */
  private getTimeSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - date.getTime());

    switch (this.config.timeUnit) {
      case 'seconds':
        return diffMs / 1000;
      case 'minutes':
        return diffMs / (1000 * 60);
      case 'weeks':
      default:
        return diffMs / (1000 * 60 * 60 * 24 * 7);
    }
  }

  /**
   * Get all assigned issues from the repository
   */
  private async getAssignedIssues(): Promise<IssueData[]> {
    console.log(`Fetching assigned issues from ${this.config.owner}/${this.config.repo}...`);
    
    const issues: IssueData[] = [];
    let page = 1;
    
    while (true) {
      const response = await this.octokit.issues.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        state: 'open',
        assignee: '*', // Only get assigned issues
        per_page: 100,
        page: page,
      });

      if (response.data.length === 0) break;
      
      issues.push(...response.data.map(issue => ({
        number: issue.number,
        title: issue.title,
        assignees: issue.assignees || [],
        updated_at: issue.updated_at,
        created_at: issue.created_at,
        html_url: issue.html_url,
      })));
      
      page++;
    }

    console.log(`Found ${issues.length} assigned issues`);
    return issues;
  }

  /**
   * Check if an issue already has a warning comment
   */
  private async hasWarningComment(issueNumber: number): Promise<boolean> {
    const comments = await this.octokit.issues.listComments({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
    });

    return comments.data.some(comment => 
      comment.body?.includes('This task will auto unassign in 1 week') ||
      comment.body?.includes('AUTO-UNASSIGN-WARNING')
    );
  }

  /**
   * Post a warning comment on an issue
   */
  private async postWarningComment(issue: IssueData): Promise<void> {
    const assigneeLogins = issue.assignees.map(a => `@${a.login}`).join(' ');
    
    const warningMessage = `
🤖 **Auto-Unassign Warning** 

Hi ${assigneeLogins}! 

This issue hasn't had activity in the past ${this.config.warningWeeks} weeks. 

Please add a comment using the below template (even if you have a pull request).

1. Progress: "What is the current status of your project? What have you completed and what is left to do?"
2. Blockers: "Difficulties or errors encountered."
3. Availability: "How much time will you have in the coming weeks to work on this issue?"
4. ETA: "When do you expect this issue to be completed?"
5. Pictures (optional): "Add any pictures of the visual changes made to the site so far."

If you need help, please request for assistance on the #bettervoting slack channel. 

**This task will auto-unassign in ${this.config.unassignWeeks-this.config.warningWeeks} week** unless a comment is added.

<!-- AUTO-UNASSIGN-WARNING -->
    `.trim();

    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would post warning comment on issue #${issue.number}: ${issue.title}`);
      console.log(`Message: ${warningMessage}`);
      return;
    }

    await this.octokit.issues.createComment({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issue.number,
      body: warningMessage,
    });

    console.log(`✅ Posted warning comment on issue #${issue.number}: ${issue.title}`);
  }

  /**
   * Unassign all assignees from an issue
   */
  private async unassignIssue(issue: IssueData): Promise<void> {
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would unassign issue #${issue.number}: ${issue.title}`);
      return;
    }

    await this.octokit.issues.update({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issue.number,
      assignees: [], // Remove all assignees
    });

    // Post a comment explaining the auto-unassignment
    const assigneeLogins = issue.assignees.map(a => `@${a.login}`).join(' ');
    const unassignMessage = `
🤖 **Auto-Unassigned**

This issue has been automatically unassigned from ${assigneeLogins} due to ${this.config.unassignWeeks} weeks of inactivity.

The issue remains open and available for anyone to pick up. Feel free to assign yourself if you'd like to work on it!
    `.trim();

    await this.octokit.issues.createComment({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issue.number,
      body: unassignMessage,
    });

    console.log(`✅ Auto-unassigned issue #${issue.number}: ${issue.title}`);
  }

  /**
   * Process all assigned issues and take appropriate actions
   */
  async processStaleIssues(): Promise<void> {
    console.log('🚀 Starting stale issue management...');
    console.log(`Configuration:
      - Time unit: ${this.config.timeUnit}
      - Warning after: ${this.config.warningWeeks} ${this.config.timeUnit}
      - Unassign after: ${this.config.unassignWeeks} ${this.config.timeUnit}
      - Dry run: ${this.config.dryRun}
    `);

    const issues = await this.getAssignedIssues();
    
    let warningCount = 0;
    let unassignCount = 0;

    for (const issue of issues) {
      const timeSinceUpdate = this.getTimeSince(issue.updated_at);

      // Format age display based on time unit
      let ageDisplay: string;
      if (this.config.timeUnit === 'seconds') {
        ageDisplay = `${timeSinceUpdate.toFixed(1)} seconds ago`;
      } else if (this.config.timeUnit === 'minutes') {
        ageDisplay = `${timeSinceUpdate.toFixed(2)} minutes ago`;
      } else {
        // weeks
        if (timeSinceUpdate < 0.01) {
          const minutes = Math.round(timeSinceUpdate * 7 * 24 * 60);
          ageDisplay = `${minutes} minute(s) ago`;
        } else if (timeSinceUpdate < 1) {
          ageDisplay = `${timeSinceUpdate.toFixed(4)} weeks ago`;
        } else {
          ageDisplay = `${Math.round(timeSinceUpdate)} weeks ago`;
        }
      }

      console.log(`\nProcessing issue #${issue.number}: ${issue.title}`);
      console.log(`  Last updated: ${issue.updated_at} (${ageDisplay})`);
      console.log(`  Assignees: ${issue.assignees.map(a => a.login).join(', ')}`);

      if (timeSinceUpdate >= this.config.unassignWeeks) {
        // Issue should be unassigned
        await this.unassignIssue(issue);
        unassignCount++;
      } else if (timeSinceUpdate >= this.config.warningWeeks) {
        // Issue should get a warning (if it doesn't already have one)
        const hasWarning = await this.hasWarningComment(issue.number);
        if (!hasWarning) {
          await this.postWarningComment(issue);
          warningCount++;
        } else {
          console.log(`  ⏭️  Already has warning comment, skipping`);
        }
      } else {
        console.log(`  ✅ Issue is still active (${ageDisplay})`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Summary:
      - Issues processed: ${issues.length}
      - Warnings posted: ${warningCount}
      - Issues unassigned: ${unassignCount}
    `);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Get configuration from environment variables
    const token = process.env.GITHUB_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;
    const dryRun = process.env.DRY_RUN === 'true';
    
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

    const timeUnit = (process.env.TIME_UNIT || 'weeks') as 'weeks' | 'minutes' | 'seconds';

    const config: Config = {
      owner,
      repo,
      warningWeeks: parseFloat(process.env.WARNING_WEEKS || '5'),
      unassignWeeks: parseFloat(process.env.UNASSIGN_WEEKS || '6'),
      dryRun,
      timeUnit,
    };

    const manager = new StaleIssueManager(token, config);
    await manager.processStaleIssues();
    
    console.log('✅ Stale issue management completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}
