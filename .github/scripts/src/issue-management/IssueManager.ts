import { Octokit } from '@octokit/rest';
import { IssueData, Config } from './main';
import { IssueAuditor } from './IssueAuditor';
import { StaleIssueChecker } from './StaleIssueChecker';

/**
 * Main manager that orchestrates both auditing and stale checking
 */
export class IssueManager {
  private octokit: Octokit;
  private config: Config;
  private auditor: IssueAuditor;
  private staleChecker: StaleIssueChecker;

  constructor(token: string, config: Config) {
    this.octokit = new Octokit({ auth: token });
    this.config = config;
    this.auditor = new IssueAuditor(this.octokit, config);
    this.staleChecker = new StaleIssueChecker(this.octokit, config);
  }

  /**
   * Get all open issues from the repository
   */
  private async getAllOpenIssues(): Promise<IssueData[]> {
    console.log(`Fetching all open issues from ${this.config.owner}/${this.config.repo}...`);
    
    const issues: IssueData[] = [];
    let page = 1;
    
    while (true) {
      const response = await this.octokit.issues.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        state: 'open',
        per_page: 100,
        page: page,
      });

      if (response.data.length === 0) break;
      
      issues.push(...response.data.map(issue => ({
        number: issue.number,
        title: issue.title,
        assignees: issue.assignees ?? [],
        updated_at: issue.updated_at,
        created_at: issue.created_at,
        html_url: issue.html_url,
        labels: (issue.labels ?? []).map(label => ({
          name: typeof label === 'string' ? label : label.name ?? ''
        })),
        node_id: issue.node_id,
      })));
      
      page++;
    }

    console.log(`Found ${issues.length} open issues`);
    return issues;
  }

  /**
   * Process all issues: run audits and check for staleness
   */
  async processIssues(): Promise<void> {
    console.log('🚀 Starting issue management...');
    console.log(`Configuration:
      - Repository: ${this.config.owner}/${this.config.repo}
      - Time unit: ${this.config.timeUnit}
      - Warning after: ${this.config.warningWeeks} ${this.config.timeUnit}
      - Inactive after: ${this.config.unassignWeeks} ${this.config.timeUnit}
      - Dry run: ${this.config.dryRun}
      - Project number: ${this.config.projectNumber || 'not configured'}
    `);

    // Initialize project information if configured
    await this.auditor.initializeProjectInfo();

    // Get all open issues
    const allIssues = await this.getAllOpenIssues();
    
    // Run audits on all issues
    const auditResults = await this.auditor.auditAllIssues(allIssues);
    
    // Check stale status for assigned issues
    const staleResults = await this.staleChecker.checkStaleIssues(allIssues);

    console.log(`\n📊 Summary:
      - Total issues processed: ${allIssues.length}
      - Assigned issues: ${allIssues.filter(i => i.assignees.length > 0).length}
      
      Auditing:
      - Missing complexity labels added: ${auditResults.missingComplexity}
      - Missing role labels added: ${auditResults.missingRole}
      - Project status updates: ${auditResults.statusUpdates}
      
      Stale Checking:
      - Warnings posted: ${staleResults.warnings}
      - Issues marked inactive: ${staleResults.inactive}
    `);
  }
}
