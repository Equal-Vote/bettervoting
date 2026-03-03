import 'dotenv/config';

interface MockIssue {
  number: number;
  title: string;
  assignees: Array<{ login: string }>;
  updated_at: string;
  created_at: string;
  html_url: string;
  weeksSinceUpdate: number;
}

interface Config {
  warningWeeks: number;
  unassignWeeks: number;
  dryRun: boolean;
}

class StaleIssueSimulator {
  private config: Config;
  private mockIssues: MockIssue[];

  constructor(config: Config) {
    this.config = config;
    this.mockIssues = this.generateMockIssues();
  }

  /**
   * Generate mock issues with various staleness levels
   */
  private generateMockIssues(): MockIssue[] {
    const now = new Date();
    const issues: MockIssue[] = [];

    // Helper to create a date N weeks ago
    const weeksAgo = (weeks: number): string => {
      const date = new Date(now);
      date.setDate(date.getDate() - (weeks * 7));
      return date.toISOString();
    };

    // Issue 1: Very stale (8 weeks) - should be unassigned
    issues.push({
      number: 101,
      title: 'Implement user authentication system',
      assignees: [{ login: 'developer1' }],
      updated_at: weeksAgo(8),
      created_at: weeksAgo(12),
      html_url: 'https://github.com/example/repo/issues/101',
      weeksSinceUpdate: 8,
    });

    // Issue 2: Stale (7 weeks) - should be unassigned
    issues.push({
      number: 102,
      title: 'Fix database connection pooling',
      assignees: [{ login: 'developer2' }, { login: 'developer3' }],
      updated_at: weeksAgo(7),
      created_at: weeksAgo(10),
      html_url: 'https://github.com/example/repo/issues/102',
      weeksSinceUpdate: 7,
    });

    // Issue 3: At unassign threshold (6 weeks) - should be unassigned
    issues.push({
      number: 103,
      title: 'Update API documentation',
      assignees: [{ login: 'developer1' }],
      updated_at: weeksAgo(6),
      created_at: weeksAgo(8),
      html_url: 'https://github.com/example/repo/issues/103',
      weeksSinceUpdate: 6,
    });

    // Issue 4: Warning threshold (5 weeks) - should get warning
    issues.push({
      number: 104,
      title: 'Refactor payment processing module',
      assignees: [{ login: 'developer4' }],
      updated_at: weeksAgo(5),
      created_at: weeksAgo(7),
      html_url: 'https://github.com/example/repo/issues/104',
      weeksSinceUpdate: 5,
    });

    // Issue 5: Just past warning (5.5 weeks) - should get warning
    issues.push({
      number: 105,
      title: 'Add email notification feature',
      assignees: [{ login: 'developer2' }],
      updated_at: weeksAgo(5.5),
      created_at: weeksAgo(9),
      html_url: 'https://github.com/example/repo/issues/105',
      weeksSinceUpdate: 5.5,
    });

    // Issue 6: Active (3 weeks) - no action
    issues.push({
      number: 106,
      title: 'Optimize database queries',
      assignees: [{ login: 'developer5' }],
      updated_at: weeksAgo(3),
      created_at: weeksAgo(4),
      html_url: 'https://github.com/example/repo/issues/106',
      weeksSinceUpdate: 3,
    });

    // Issue 7: Very active (1 week) - no action
    issues.push({
      number: 107,
      title: 'Fix login redirect bug',
      assignees: [{ login: 'developer3' }],
      updated_at: weeksAgo(1),
      created_at: weeksAgo(2),
      html_url: 'https://github.com/example/repo/issues/107',
      weeksSinceUpdate: 1,
    });

    // Issue 8: Brand new (0 weeks) - no action
    issues.push({
      number: 108,
      title: 'Add dark mode support',
      assignees: [{ login: 'developer1' }, { login: 'developer4' }],
      updated_at: weeksAgo(0),
      created_at: weeksAgo(0.5),
      html_url: 'https://github.com/example/repo/issues/108',
      weeksSinceUpdate: 0,
    });

    return issues;
  }

  /**
   * Simulate posting a warning comment
   */
  private async postWarningComment(issue: MockIssue): Promise<void> {
    const assigneeLogins = issue.assignees.map(a => `@${a.login}`).join(' ');
    const warningMessage = `
🤖 **Inactivity Warning**

Hi ${assigneeLogins}! 

This issue has been assigned for ${this.config.warningWeeks} weeks with no recent activity. 

**This task will auto-unassign in 1 week** unless there's activity (comments, commits, or other updates).

If you're still working on this issue, please leave a comment to keep it assigned to you.

<!-- AUTO-UNASSIGN-WARNING -->
    `.trim();

    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would post warning comment on issue #${issue.number}: ${issue.title}`);
      console.log(`Message preview:\n${warningMessage}\n`);
      return;
    }

    console.log(`✅ Posted warning comment on issue #${issue.number}: ${issue.title}`);
  }

  /**
   * Simulate unassigning an issue
   */
  private async unassignIssue(issue: MockIssue): Promise<void> {
    const assigneeLogins = issue.assignees.map(a => `@${a.login}`).join(' ');
    
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would unassign issue #${issue.number}: ${issue.title}`);
      console.log(`  Would remove assignees: ${assigneeLogins}`);
      return;
    }

    const unassignMessage = `
🤖 **Auto-Unassigned**

This issue has been automatically unassigned from ${assigneeLogins} due to ${this.config.unassignWeeks} weeks of inactivity.

The issue remains open and available for anyone to pick up. Feel free to assign yourself if you'd like to work on it!
    `.trim();

    console.log(`✅ Auto-unassigned issue #${issue.number}: ${issue.title}`);
    console.log(`Message: ${unassignMessage}\n`);
  }

  /**
   * Process all mock issues
   */
  async processStaleIssues(): Promise<void> {
    console.log('🎭 SIMULATION MODE - Using Mock Data');
    console.log('=====================================\n');
    console.log('🚀 Starting stale issue management...');
    console.log(`Configuration:
      - Warning after: ${this.config.warningWeeks} weeks
      - Unassign after: ${this.config.unassignWeeks} weeks
      - Dry run: ${this.config.dryRun}
    `);

    console.log(`\nGenerated ${this.mockIssues.length} mock issues for testing\n`);
    
    let warningCount = 0;
    let unassignCount = 0;

    for (const issue of this.mockIssues) {
      console.log(`\nProcessing issue #${issue.number}: ${issue.title}`);
      console.log(`  Last updated: ${issue.updated_at} (${issue.weeksSinceUpdate} weeks ago)`);
      console.log(`  Assignees: ${issue.assignees.map(a => a.login).join(', ')}`);

      if (issue.weeksSinceUpdate >= this.config.unassignWeeks) {
        // Issue should be unassigned
        await this.unassignIssue(issue);
        unassignCount++;
      } else if (issue.weeksSinceUpdate >= this.config.warningWeeks) {
        // Issue should get a warning
        await this.postWarningComment(issue);
        warningCount++;
      } else {
        console.log(`  ✅ Issue is still active (${issue.weeksSinceUpdate} weeks old)`);
      }

      // Small delay for readability
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Summary:
      - Issues processed: ${this.mockIssues.length}
      - Warnings posted: ${warningCount}
      - Issues unassigned: ${unassignCount}
    `);

    console.log('\n🎭 SIMULATION COMPLETE');
    console.log('=====================================');
    console.log('This was a simulation with mock data.');
    console.log('No actual GitHub API calls were made.');
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    const config: Config = {
      warningWeeks: parseInt(process.env.WARNING_WEEKS || '5', 10),
      unassignWeeks: parseInt(process.env.UNASSIGN_WEEKS || '6', 10),
      dryRun: process.env.DRY_RUN !== 'false', // Default to true for simulation
    };

    const simulator = new StaleIssueSimulator(config);
    await simulator.processStaleIssues();
    
    console.log('\n✅ Simulation completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

