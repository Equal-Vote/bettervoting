import { Octokit } from '@octokit/rest';
import { IssueData, Config } from './main';

/**
 * Handles checking and managing stale assigned issues
 */
export class StaleIssueChecker {
  private octokit: Octokit;
  private config: Config;

  constructor(octokit: Octokit, config: Config) {
    this.octokit = octokit;
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
   * Format age display based on time unit
   */
  private formatAge(timeSinceUpdate: number): string {
    let value: string;
    let unit: string;

    switch (this.config.timeUnit) {
      case 'seconds':
        value = timeSinceUpdate.toFixed(1);
        unit = 'seconds';
        break;
      case 'minutes':
        value = timeSinceUpdate.toFixed(2);
        unit = 'minutes';
        break;
      case 'weeks':
      default:
        if (timeSinceUpdate < 0.01) {
          value = String(Math.round(timeSinceUpdate * 7 * 24 * 60));
          unit = 'minute(s)';
        } else if (timeSinceUpdate < 1) {
          value = timeSinceUpdate.toFixed(4);
          unit = 'weeks';
        } else {
          value = String(Math.round(timeSinceUpdate));
          unit = 'weeks';
        }
    }

    return `${value} ${unit} ago`;
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
   * Check if issue has a specific label
   */
  private hasLabel(issue: IssueData, labelName: string): boolean {
    return issue.labels.some(label => 
      label.name.toLowerCase() === labelName.toLowerCase()
    );
  }

  /**
   * Add a label to an issue
   */
  private async addLabel(issue: IssueData, labelName: string): Promise<void> {
    if (this.config.dryRun) {
      console.log(`  [DRY RUN] Would add label "${labelName}" to issue #${issue.number}`);
      return;
    }

    try {
      await this.octokit.issues.addLabels({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issue.number,
        labels: [labelName],
      });
      console.log(`  ✅ Added label "${labelName}" to issue #${issue.number}`);
    } catch (error) {
      console.error(`  ❌ Error adding label "${labelName}" to issue #${issue.number}:`, error);
    }
  }

  /**
   * Post a warning comment on an issue
   */
  private async postWarningComment(issue: IssueData): Promise<void> {
    const assigneeLogins = issue.assignees.map(a => `@${a.login}`).join(' ');

    const warningMessage = `🤖 **Check-In Reminder**

Hi ${assigneeLogins}!

This issue hasn't had activity in the past ${this.config.warningWeeks} ${this.config.timeUnit}.

Please add a comment using the below template (even if you have a pull request).

1. Progress: "What is the current status of your project? What have you completed and what is left to do?"
2. Blockers: "Difficulties or errors encountered."
3. Availability: "How much time will you have in the coming weeks to work on this issue?"
4. ETA: "When do you expect this issue to be completed?"
5. Pictures (optional): "Add any pictures of the visual changes made to the site so far."

If you need help, please request for assistance on the #bettervoting slack channel.

**This issue will be marked as inactive in ${this.config.unassignWeeks - this.config.warningWeeks} ${this.config.timeUnit}** unless a comment is added.

<!-- AUTO-UNASSIGN-WARNING -->`;

    if (this.config.dryRun) {
      console.log(`  [DRY RUN] Would post warning comment on issue #${issue.number}`);
      return;
    }

    await this.octokit.issues.createComment({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issue.number,
      body: warningMessage,
    });

    console.log(`  ✅ Posted warning comment on issue #${issue.number}`);
  }

  /**
   * Check stale status for assigned issues
   */
  async checkStaleIssues(issues: IssueData[]): Promise<{ warnings: number; inactive: number }> {
    let warningCount = 0;
    let inactiveCount = 0;

    console.log('\n⏰ Checking stale status for assigned issues...');

    const assignedIssues = issues.filter(issue => issue.assignees.length > 0);
    console.log(`  Found ${assignedIssues.length} assigned issues to check`);

    for (const issue of assignedIssues) {
      const timeSinceUpdate = this.getTimeSince(issue.updated_at);
      const ageDisplay = this.formatAge(timeSinceUpdate);

      console.log(`\n  Checking issue #${issue.number}: ${issue.title}`);
      console.log(`    Last updated: ${ageDisplay}`);
      console.log(`    Assignees: ${issue.assignees.map(a => a.login).join(', ')}`);

      if (timeSinceUpdate >= this.config.unassignWeeks) {
        // Issue should get inactive label
        if (!this.hasLabel(issue, '2 weeks inactive')) {
          console.log(`    ⚠️  Marking as inactive (${ageDisplay})`);
          await this.addLabel(issue, '2 weeks inactive');
          inactiveCount++;
        } else {
          console.log(`    ⏭️  Already marked inactive`);
        }
      } else if (timeSinceUpdate >= this.config.warningWeeks) {
        // Issue should get a warning
        const hasWarning = await this.hasWarningComment(issue.number);
        if (!hasWarning) {
          console.log(`    ⚠️  Posting warning (${ageDisplay})`);
          await this.postWarningComment(issue);
          await this.addLabel(issue, 'To Update !');
          warningCount++;
        } else {
          console.log(`    ⏭️  Already has warning`);
        }
      } else {
        console.log(`    ✅ Still active (${ageDisplay})`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      warnings: warningCount,
      inactive: inactiveCount,
    };
  }
}
