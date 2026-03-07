import { Octokit } from '@octokit/rest';
import { IssueData, Config, ProjectItemStatus } from './main';

/**
 * Handles auditing of all open issues for missing labels and project board status
 */
export class IssueAuditor {
  private octokit: Octokit;
  private config: Config;
  private projectId?: string;
  private statusFieldId?: string;
  private statusOptions: Map<string, string> = new Map();

  constructor(octokit: Octokit, config: Config) {
    this.octokit = octokit;
    this.config = config;
  }

  /**
   * Initialize project information (project ID, status field, etc.)
   */
  async initializeProjectInfo(): Promise<void> {
    if (!this.config.projectNumber) {
      console.log('⚠️  No project number configured, skipping project board updates');
      return;
    }

    try {
      console.log(`Fetching project information for project #${this.config.projectNumber}...`);
      
      // Try as organization first
      let query = `
        query($owner: String!, $number: Int!) {
          organization(login: $owner) {
            projectV2(number: $number) {
              id
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;

      let response: any;
      try {
        response = await this.octokit.graphql(query, {
          owner: this.config.owner,
          number: this.config.projectNumber,
        });
        this.projectId = response.organization.projectV2.id;
      } catch (error) {
        // Try as user
        query = `
          query($owner: String!, $number: Int!) {
            user(login: $owner) {
              projectV2(number: $number) {
                id
                fields(first: 20) {
                  nodes {
                    ... on ProjectV2SingleSelectField {
                      id
                      name
                      options {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        
        response = await this.octokit.graphql(query, {
          owner: this.config.owner,
          number: this.config.projectNumber,
        });
        this.projectId = response.user.projectV2.id;
      }
      
      // Find the Status field (prefer Test Status for testing, then Status)
      const projectData = response.organization?.projectV2 ?? response.user?.projectV2;
      const fields = projectData.fields.nodes;
      
      // Try Test Status first (for testing), then fall back to Status
      let statusField = fields.find((f: any) => f.name === 'Test Status');
      if (!statusField) {
        statusField = fields.find((f: any) => f.name === 'Status');
      }
      
      if (statusField) {
        this.statusFieldId = statusField.id;
        // Store both original name and lowercase for flexible lookup
        statusField.options.forEach((opt: any) => {
          this.statusOptions.set(opt.name, opt.id); // Original case
          this.statusOptions.set(opt.name.toLowerCase(), opt.id); // Lowercase
        });
        console.log(`✅ Found ${statusField.name} field with options: ${statusField.options.map((o: any) => o.name).join(', ')}`);
      } else {
        console.log('⚠️  Status field not found in project');
      }
    } catch (error) {
      console.error('❌ Error initializing project info:', error);
      this.projectId = undefined;
    }
  }

  /**
   * Get the project status for an issue
   */
  private async getIssueProjectStatus(issue: IssueData): Promise<ProjectItemStatus> {
    if (!this.projectId) {
      return {};
    }

    try {
      // Get all items and find the one matching our issue
      const query = `
        query($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 100) {
                nodes {
                  id
                  content {
                    ... on Issue {
                      id
                      number
                    }
                  }
                  fieldValues(first: 10) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response: any = await this.octokit.graphql(query, {
        projectId: this.projectId,
      });

      const items = response.node.items.nodes;
      
      // Find the item that matches our issue
      const matchingItem = items.find((item: any) => item.content?.id === issue.node_id);
      
      if (matchingItem) {
        // Find the status field value (either "Status" or "Test Status")
        const statusFieldValue = matchingItem.fieldValues.nodes.find((fv: any) => 
          fv.field?.name === 'Status' || fv.field?.name === 'Test Status'
        );
        
        if (statusFieldValue) {
          return {
            itemId: matchingItem.id,
            statusValue: statusFieldValue.name,
          };
        }
        
        // Item exists but no status set
        return {
          itemId: matchingItem.id,
        };
      }
    } catch (error) {
      console.error(`  ⚠️  Error getting project status for issue #${issue.number}:`, error);
    }

    return {};
  }

  /**
   * Update the project status for an issue
   */
  private async updateIssueProjectStatus(
    issue: IssueData,
    itemId: string,
    newStatus: string
  ): Promise<void> {
    if (!this.statusFieldId || !this.projectId) {
      return;
    }

    // Try exact match first, then case-insensitive
    let statusOptionId = this.statusOptions.get(newStatus);
    if (!statusOptionId) {
      statusOptionId = this.statusOptions.get(newStatus.toLowerCase());
    }
    
    if (!statusOptionId) {
      console.log(`  ⚠️  Status option "${newStatus}" not found`);
      console.log(`     Available options: ${Array.from(this.statusOptions.keys()).join(', ')}`);
      return;
    }

    if (this.config.dryRun) {
      console.log(`  [DRY RUN] Would update project status to "${newStatus}" for issue #${issue.number}`);
      return;
    }

    try {
      const mutation = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: { singleSelectOptionId: $optionId }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
      `;

      await this.octokit.graphql(mutation, {
        projectId: this.projectId,
        itemId: itemId,
        fieldId: this.statusFieldId,
        optionId: statusOptionId,
      });

      console.log(`  ✅ Updated project status to "${newStatus}" for issue #${issue.number}`);
    } catch (error) {
      console.error(`  ❌ Error updating project status for issue #${issue.number}:`, error);
    }
  }

  /**
   * Check if issue has a label matching a prefix
   */
  private hasLabelWithPrefix(issue: IssueData, prefix: string): boolean {
    return issue.labels.some(label => 
      label.name.toLowerCase().startsWith(prefix.toLowerCase())
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
   * Audit an issue for missing labels
   * Returns count of labels added
   */
  async auditLabels(issue: IssueData): Promise<number> {
    let labelsAdded = 0;

    // Check for missing complexity label
    if (!this.hasLabelWithPrefix(issue, 'Complexity:') && !this.hasLabelWithPrefix(issue, 'good first issue')) {
      console.log(`  ⚠️  Missing complexity label`);
      await this.addLabel(issue, 'Complexity: Missing');
      labelsAdded++;
    }

    // Check for missing role label
    if (!this.hasLabelWithPrefix(issue, 'Role:')) {
      console.log(`  ⚠️  Missing role label`);
      await this.addLabel(issue, 'Role: Missing');
      labelsAdded++;
    }

    return labelsAdded;
  }

  /**
   * Audit project board status and update if needed
   * Returns true if status was updated
   */
  async auditProjectStatus(issue: IssueData): Promise<boolean> {
    if (!this.projectId) {
      return false;
    }

    const projectStatus = await this.getIssueProjectStatus(issue);
    
    if (!projectStatus.itemId || !projectStatus.statusValue) {
      return false;
    }

    const isAssigned = issue.assignees.length > 0;
    console.log(`  📋 Project status: ${projectStatus.statusValue}`);
    
    // Rule: if assigned and board_status != 'in progress' -> move to 'in progress'
    if (isAssigned && projectStatus.statusValue.toLowerCase() !== 'in progress') {
      console.log(`  🔄 Issue is assigned but not in "In Progress" status`);
      await this.updateIssueProjectStatus(issue, projectStatus.itemId, 'In Progress');
      return true;
    }
    
    // Rule: if unassigned && board_status == 'in progress' -> move to 'prioritized backlog'
    if (!isAssigned && projectStatus.statusValue.toLowerCase() === 'in progress') {
      console.log(`  🔄 Issue is unassigned but still in "In Progress" status`);
      await this.updateIssueProjectStatus(issue, projectStatus.itemId, 'Prioritized Backlog');
      return true;
    }

    return false;
  }

  /**
   * Run all audits on all open issues
   */
  async auditAllIssues(issues: IssueData[]): Promise<{ missingComplexity: number; missingRole: number; statusUpdates: number }> {
    let missingComplexityCount = 0;
    let missingRoleCount = 0;
    let statusUpdateCount = 0;

    console.log('\n🔍 Running issue audits...');

    for (const issue of issues) {
      console.log(`\n  Auditing issue #${issue.number}: ${issue.title}`);
      
      // Audit labels
      const labelsAdded = await this.auditLabels(issue);
      if (labelsAdded > 0) {
        if (this.hasLabelWithPrefix(issue, 'Complexity: Missing')) missingComplexityCount++;
        if (this.hasLabelWithPrefix(issue, 'Role: Missing')) missingRoleCount++;
      }

      // Audit project status
      const statusUpdated = await this.auditProjectStatus(issue);
      if (statusUpdated) {
        statusUpdateCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      missingComplexity: missingComplexityCount,
      missingRole: missingRoleCount,
      statusUpdates: statusUpdateCount,
    };
  }
}
