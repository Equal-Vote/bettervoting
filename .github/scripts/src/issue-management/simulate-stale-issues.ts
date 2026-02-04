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
  inactiveWeeks: number;
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

    // Issue 1: Very stale (8 weeks) - should be marked inactive
    issues.push({
      number: 101,
      title: 'Implement user authentication system',
      assignees: [{ login: 'developer1' }],
      updated_at: weeksAgo(8),
      created_at: weeksAgo(12),
      html_url: 'https://github.com/example/repo/issues/101',
      weeksSinceUpdate: 8,
    });

    // Issue 2: Stale (7 weeks) - should be marked inactive
    issues.push({
      number: 102,
      title: 'Fix database connection pooling',
      assignees: [{ login: 'developer2' }, { login: 'developer3' }],
      updated_at: weeksAgo(7),
      created_at: weeksAgo(10),
      html_url: 'https://github.com/example/repo/issues/102',
      weeksSinceUpdate: 7,
    });

    // Issue 3: At inactive threshold (2 weeks) - should be marked inactive
    issues.push({
      number: 103,
      title: 'Update API documentation',
      assignees: [{ login: 'developer1' }],
      updated_at: weeksAgo(2),
      created_at: weeksAgo(8),
      html_url: 'https://github.com/example/repo/issues/103',
      weeksSinceUpdate: 2,
    });

    // Issue 4: Warning threshold (1 week) - should get warning
    issues.push({
      number: 104,
      title: 'Refactor payment processing module',
      assignees: [{ login: 'developer4' }],
      updated_at: weeksAgo(1),
      created_at: weeksAgo(7),
      html_url: 'https://github.com/example/repo/issues/104',
      weeksSinceUpdate: 1,
    });

    // Issue 5: Just past warning (1.5 weeks) - should get warning
    issues.push({
      number: 105,
      title: 'Add email notification feature',
      assignees: [{ login: 'developer2' }],
      updated_at: weeksAgo(1.5),
      created_at: weeksAgo(9),
      html_url: 'https://github.com/example/repo/issues/105',
      weeksSinceUpdate: 1.5,
    });

    // Issue 6: Active (0.5 weeks) - no action
    issues.push({
      number: 106,
      title: 'Optimize database queries',
      assignees: [{ login: 'developer5' }],
      updated_at: weeksAgo(0.5),
      created_at: weeksAgo(4),
      html_url: 'https://github.com/example/repo/issues/106',
      weeksSinceUpdate: 0.5,
    });

    // Issue 7: Very active (0.2 weeks) - no action
    issues.push({
      number: 107,
      title: 'Fix login redirect bug',
      assignees: [{ login: 'developer3' }],
      updated_at: weeksAgo(0.2),
      created_at: weeksAgo(2),
      html_url: 'https://github.com/example/repo/issues/107',
      weeksSinceUpdate: 0.2,
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
   * Simulate posting a warning comment and applying "To Update !" label
   */
  private async postWarningComment(issue: MockIssue): Promise<void> {
    const assigneeLogins = issue.assignees.map(a => `@${a.login}`).join(' ');
    const warningMessage = `
🤖 **Check-In Bot Warning**

Hi ${assigneeLogins}! 

This issue hasn't had activity in the past ${this.config.warningWeeks} week(s). 

Please add a comment with an update on your progress.

**A dev lead will check in on this issue** if no update is provided within ${this.config.inactiveWeeks - this.config.warningWeeks} week(s).

<!-- AUTO-CHECK-IN-WARNING -->
    `.trim();

    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would post warning comment on issue #${issue.number}: ${issue.title}`);
      console.log(`[DRY RUN] Would apply "To Update !" label`);
      console.log(`Message preview:\n${warningMessage}\n`);
      return;
    }

    console.log(`✅ Posted warning comment on issue #${issue.number}: ${issue.title}`);
    console.log(`✅ Applied "To Update !" label`);
  }

  /**
   * Simulate applying "2 weeks inactive" label (instead of unassigning)
   */
  private async applyInactiveLabel(issue: MockIssue): Promise<void> {
    const assigneeLogins = issue.assignees.map(a => `@${a.login}`).join(' ');
    
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would apply "2 weeks inactive" label to issue #${issue.number}: ${issue.title}`);
      console.log(`  Assignees remain: ${assigneeLogins}`);
      return;
    }

    const inactiveMessage = `
🤖 **Check-In Bot Notice**

This issue has been marked as inactive due to ${this.config.inactiveWeeks} week(s) of inactivity.

${assigneeLogins} - A dev lead will check in on this issue to see if you need any support or if the assignment should be changed.

The issue remains assigned to you for now. Please provide an update when you can!
    `.trim();

    console.log(`✅ Applied "2 weeks inactive" label to issue #${issue.number}: ${issue.title}`);
    console.log(`Message: ${inactiveMessage}\n`);
  }

  /**
   * Process all mock issues
   */
  async processStaleIssues(): Promise<void> {
    console.log('🎭 SIMULATION MODE - Using Mock Data');
    console.log('=====================================\n');
    console.log('🚀 Starting stale issue management...');
    console.log(`Configuration:
      - Warning after: ${this.config.warningWeeks} week(s)
      - Inactive label after: ${this.config.inactiveWeeks} week(s)
      - Dry run: ${this.config.dryRun}
    `);

    console.log(`\nGenerated ${this.mockIssues.length} mock issues for testing\n`);
    
    let warningCount = 0;
    let inactiveCount = 0;

    for (const issue of this.mockIssues) {
      console.log(`\nProcessing issue #${issue.number}: ${issue.title}`);
      console.log(`  Last updated: ${issue.updated_at} (${issue.weeksSinceUpdate} weeks ago)`);
      console.log(`  Assignees: ${issue.assignees.map(a => a.login).join(', ')}`);

      if (issue.weeksSinceUpdate >= this.config.inactiveWeeks) {
        // Issue should get "2 weeks inactive" label
        await this.applyInactiveLabel(issue);
        inactiveCount++;
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
      - Issues marked inactive: ${inactiveCount}
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
      warningWeeks: parseInt(process.env.WARNING_WEEKS || '1', 10),
      inactiveWeeks: parseInt(process.env.INACTIVE_WEEKS || '2', 10),
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

