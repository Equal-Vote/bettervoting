import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

interface TestConfig {
  token: string;
  owner: string;
  repo: string;
  dryRun: boolean;
}

interface TestProject {
  projectId: string;
  projectNumber: number;
  statusFieldId: string;
  statusOptions: {
    inProgress: string;
    prioritizedBacklog: string;
    todo: string;
  };
}

interface TestIssue {
  number: number;
  title: string;
  expectedLabels: string[];
  expectedStatus?: string;
}

interface TestResults {
  projectNumber: number;
  projectId: string;
  issues: number[];
}

class AuditingTestRunner {
  private octokit: Octokit;
  private config: TestConfig;
  private testResults: TestResults = {
    projectNumber: 0,
    projectId: '',
    issues: [],
  };

  constructor(config: TestConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.config = config;
  }

  /**
   * Get the user/org node ID for creating a project
   */
  private async getOwnerNodeId(): Promise<string> {
    console.log(`\n🔍 Getting owner node ID for ${this.config.owner}...`);
    
    // Try as user first
    try {
      const userQuery = `
        query($login: String!) {
          user(login: $login) {
            id
          }
        }
      `;
      
      const response: any = await this.octokit.graphql(userQuery, {
        login: this.config.owner,
      });
      
      console.log(`  ✅ Found user node ID`);
      return response.user.id;
    } catch (error) {
      // Try as organization
      const orgQuery = `
        query($login: String!) {
          organization(login: $login) {
            id
          }
        }
      `;
      
      const response: any = await this.octokit.graphql(orgQuery, {
        login: this.config.owner,
      });
      
      console.log(`  ✅ Found organization node ID`);
      return response.organization.id;
    }
  }

  /**
   * Create a test project board with Status field
   */
  private async createTestProject(): Promise<TestProject> {
    console.log(`\n📋 Creating test project board...`);
    
    const ownerNodeId = await this.getOwnerNodeId();
    
    // Create project
    const createMutation = `
      mutation($ownerId: ID!, $title: String!) {
        createProjectV2(input: {
          ownerId: $ownerId
          title: $title
        }) {
          projectV2 {
            id
            number
          }
        }
      }
    `;
    
    const createResponse: any = await this.octokit.graphql(createMutation, {
      ownerId: ownerNodeId,
      title: '[TEST] Auditing Test Project',
    });
    
    const projectId = createResponse.createProjectV2.projectV2.id;
    const projectNumber = createResponse.createProjectV2.projectV2.number;
    
    console.log(`  ✅ Created project #${projectNumber}`);
    console.log(`     View at: https://github.com/${this.config.owner === 'recursivesquircle' ? 'users' : 'orgs'}/${this.config.owner}/projects/${projectNumber}`);
    
    // Add Status field
    const addFieldMutation = `
      mutation($projectId: ID!, $name: String!) {
        createProjectV2Field(input: {
          projectId: $projectId
          dataType: SINGLE_SELECT
          name: $name
          singleSelectOptions: [
            {name: "Todo", color: GRAY, description: "Tasks to be started"}
            {name: "In Progress", color: YELLOW, description: "Tasks currently being worked on"}
            {name: "Prioritized Backlog", color: BLUE, description: "Tasks ready to be picked up"}
          ]
        }) {
          projectV2Field {
            ... on ProjectV2SingleSelectField {
              id
              options {
                id
                name
              }
            }
          }
        }
      }
    `;
    
    const fieldResponse: any = await this.octokit.graphql(addFieldMutation, {
      projectId: projectId,
      name: 'Test Status',
    });
    
    const statusField = fieldResponse.createProjectV2Field.projectV2Field;
    const statusOptions = {
      inProgress: statusField.options.find((o: any) => o.name === 'In Progress').id,
      prioritizedBacklog: statusField.options.find((o: any) => o.name === 'Prioritized Backlog').id,
      todo: statusField.options.find((o: any) => o.name === 'Todo').id,
    };
    
    console.log(`  ✅ Added Status field with options`);
    
    return {
      projectId,
      projectNumber,
      statusFieldId: statusField.id,
      statusOptions,
    };
  }

  /**
   * Create a test issue
   */
  private async createTestIssue(
    title: string,
    assignToSelf: boolean,
    labels: string[]
  ): Promise<number> {
    const response = await this.octokit.issues.create({
      owner: this.config.owner,
      repo: this.config.repo,
      title: `[TEST-AUDIT] ${title}`,
      body: `<!-- TEST-AUDIT-MARKER -->\n\nThis is a test issue for auditing functionality.\n\nExpected labels: ${labels.join(', ') || 'none'}`,
      labels: [...labels, 'test'],
      assignees: assignToSelf ? [this.config.owner] : [],
    });
    
    return response.data.number;
  }

  /**
   * Add issue to project with specific status
   */
  private async addIssueToProject(
    issueNodeId: string,
    project: TestProject,
    statusOptionId: string
  ): Promise<string> {
    // Add issue to project
    const addMutation = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {
          projectId: $projectId
          contentId: $contentId
        }) {
          item {
            id
          }
        }
      }
    `;
    
    const addResponse: any = await this.octokit.graphql(addMutation, {
      projectId: project.projectId,
      contentId: issueNodeId,
    });
    
    const itemId = addResponse.addProjectV2ItemById.item.id;
    
    // Set status
    const updateMutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }) {
          projectV2Item {
            id
          }
        }
      }
    `;
    
    await this.octokit.graphql(updateMutation, {
      projectId: project.projectId,
      itemId: itemId,
      fieldId: project.statusFieldId,
      optionId: statusOptionId,
    });
    
    return itemId;
  }

  /**
   * Get issue node ID
   */
  private async getIssueNodeId(issueNumber: number): Promise<string> {
    const response = await this.octokit.issues.get({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
    });
    
    return response.data.node_id;
  }

  /**
   * Verify issue status in project (for debugging)
   */
  private async verifyIssueStatus(issueNumber: number, project: TestProject): Promise<string | null> {
    try {
      const nodeId = await this.getIssueNodeId(issueNumber);
      
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
        projectId: project.projectId,
      });

      const items = response.node.items.nodes;
      const matchingItem = items.find((item: any) => item.content?.id === nodeId);
      
      if (matchingItem) {
        const statusFieldValue = matchingItem.fieldValues.nodes.find((fv: any) => 
          fv.field?.name === 'Status' || fv.field?.name === 'Test Status'
        );
        
        return statusFieldValue?.name || null;
      }
    } catch (error) {
      console.error(`     Error verifying status:`, error);
    }
    
    return null;
  }

  /**
   * Create all test issues
   */
  private async createTestIssues(project: TestProject): Promise<TestIssue[]> {
    console.log(`\n📝 Creating test issues...`);
    
    const testCases: Array<{
      title: string;
      assignToSelf: boolean;
      labels: string[];
      projectStatus?: 'inProgress' | 'prioritizedBacklog' | 'todo';
      expectedLabels: string[];
      expectedStatus?: string;
    }> = [
      // Label auditing tests
      {
        title: 'No labels - should get both missing labels',
        assignToSelf: false,
        labels: [],
        expectedLabels: ['Complexity: Missing', 'Role: Missing'],
      },
      {
        title: 'Has Complexity - should get Role missing',
        assignToSelf: false,
        labels: ['Complexity: Small'],
        expectedLabels: ['Role: Missing'],
      },
      {
        title: 'Has Role - should get Complexity missing',
        assignToSelf: false,
        labels: ['Role: Frontend'],
        expectedLabels: ['Complexity: Missing'],
      },
      {
        title: 'Has both labels - should get nothing',
        assignToSelf: false,
        labels: ['Complexity: Medium', 'Role: Backend'],
        expectedLabels: [],
      },
      {
        title: 'Has good first issue - should only get Role missing',
        assignToSelf: false,
        labels: ['good first issue'],
        expectedLabels: ['Role: Missing'],
      },
      
      // Project board tests - assigned issues
      {
        title: 'Assigned in Todo - should move to In Progress',
        assignToSelf: true,
        labels: ['Complexity: Small', 'Role: Frontend'],
        projectStatus: 'todo',
        expectedLabels: [],
        expectedStatus: 'In Progress',
      },
      {
        title: 'Assigned in Prioritized Backlog - should move to In Progress',
        assignToSelf: true,
        labels: ['Complexity: Medium', 'Role: Backend'],
        projectStatus: 'prioritizedBacklog',
        expectedLabels: [],
        expectedStatus: 'In Progress',
      },
      {
        title: 'Assigned in In Progress - should stay',
        assignToSelf: true,
        labels: ['Complexity: Large', 'Role: DevOps'],
        projectStatus: 'inProgress',
        expectedLabels: [],
        expectedStatus: 'In Progress',
      },
      
      // Project board tests - unassigned issues
      {
        title: 'Unassigned in In Progress - should move to Prioritized Backlog',
        assignToSelf: false,
        labels: ['Complexity: Small', 'Role: Design'],
        projectStatus: 'inProgress',
        expectedLabels: [],
        expectedStatus: 'Prioritized Backlog',
      },
      {
        title: 'Unassigned in Prioritized Backlog - should stay',
        assignToSelf: false,
        labels: ['Complexity: Medium', 'Role: Writing'],
        projectStatus: 'prioritizedBacklog',
        expectedLabels: [],
        expectedStatus: 'Prioritized Backlog',
      },
    ];
    
    const testIssues: TestIssue[] = [];
    
    for (const testCase of testCases) {
      const issueNumber = await this.createTestIssue(
        testCase.title,
        testCase.assignToSelf,
        testCase.labels
      );
      
      console.log(`  ✅ Created issue #${issueNumber}: ${testCase.title}`);
      
      // Add to project if needed
      if (testCase.projectStatus) {
        const nodeId = await this.getIssueNodeId(issueNumber);
        const statusOptionId = project.statusOptions[testCase.projectStatus];
        await this.addIssueToProject(nodeId, project, statusOptionId);
        console.log(`     Added to project with status: ${testCase.projectStatus}`);
        
        // Verify status was set correctly (with small delay for propagation)
        await new Promise(resolve => setTimeout(resolve, 500));
        const verifyStatus = await this.verifyIssueStatus(issueNumber, project);
        console.log(`     Verified status: ${verifyStatus || 'NOT SET'}`);
      }
      
      testIssues.push({
        number: issueNumber,
        title: testCase.title,
        expectedLabels: testCase.expectedLabels,
        expectedStatus: testCase.expectedStatus,
      });
      
      this.testResults.issues.push(issueNumber);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Wait for all project items to be fully added
    if (testIssues.some(ti => ti.expectedStatus)) {
      console.log(`\n⏳ Waiting 5 seconds for project items to be fully added...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return testIssues;
  }

  /**
   * Run the auditing script
   */
  private async runAuditingScript(projectNumber: number): Promise<void> {
    console.log(`\n🚀 Running auditing script...`);
    console.log(`════════════════════════════════════════\n`);
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        GITHUB_TOKEN: this.config.token,
        GITHUB_REPOSITORY: `${this.config.owner}/${this.config.repo}`,
        DRY_RUN: 'false',
        TIME_UNIT: 'weeks',
        WARNING_WEEKS: '1',
        UNASSIGN_WEEKS: '2',
        PROJECT_NUMBER: projectNumber.toString(),
      };
      
      const child = spawn('node', ['dist/issue-management/main.js'], {
        cwd: process.cwd(),
        env,
        stdio: 'inherit',
      });
      
      child.on('close', async (code: number) => {
        if (code === 0) {
          // Wait a bit for GitHub to propagate the changes
          console.log(`\n⏳ Waiting 3 seconds for changes to propagate...`);
          await new Promise(r => setTimeout(r, 3000));
          resolve();
        } else {
          reject(new Error(`Script exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Verify results
   */
  private async verifyResults(testIssues: TestIssue[], project: TestProject): Promise<void> {
    console.log(`\n🔍 Verifying results...`);
    console.log(`════════════════════════════════════════\n`);
    
    let passed = 0;
    let failed = 0;
    
    for (const testIssue of testIssues) {
      console.log(`\n📋 Issue #${testIssue.number}: ${testIssue.title}`);
      
      // Get current issue state
      const issue = await this.octokit.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: testIssue.number,
      });
      
      const currentLabels = issue.data.labels.map((l: any) => 
        typeof l === 'string' ? l : l.name
      ).filter((l: string) => l !== 'test'); // Exclude test label
      
      // Check labels
      let labelsMatch = true;
      for (const expectedLabel of testIssue.expectedLabels) {
        if (!currentLabels.includes(expectedLabel)) {
          console.log(`  ❌ Missing expected label: ${expectedLabel}`);
          labelsMatch = false;
        }
      }
      
      if (labelsMatch && testIssue.expectedLabels.length === 0) {
        console.log(`  ✅ Labels: No labels expected, none added`);
      } else if (labelsMatch) {
        console.log(`  ✅ Labels: All expected labels present`);
      }
      
      // Check project status if applicable
      if (testIssue.expectedStatus) {
        // Use the same query approach as the auditor
        const statusQuery = `
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
        
        const statusResponse: any = await this.octokit.graphql(statusQuery, {
          projectId: project.projectId,
        });
        
        const items = statusResponse.node.items.nodes;
        const matchingItem = items.find((item: any) => item.content?.number === testIssue.number);
        
        if (matchingItem) {
          const statusFieldValue = matchingItem.fieldValues.nodes.find((fv: any) => 
            fv.field?.name === 'Status' || fv.field?.name === 'Test Status'
          );
          const currentStatus = statusFieldValue?.name;
          
          if (currentStatus === testIssue.expectedStatus) {
            console.log(`  ✅ Status: ${currentStatus} (expected: ${testIssue.expectedStatus})`);
          } else {
            console.log(`  ❌ Status: ${currentStatus} (expected: ${testIssue.expectedStatus})`);
            labelsMatch = false;
          }
        } else {
          console.log(`  ❌ Status: Issue not found in project (expected: ${testIssue.expectedStatus})`);
          labelsMatch = false;
        }
      }
      
      if (labelsMatch) {
        passed++;
      } else {
        failed++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Test Results:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📈 Success Rate: ${((passed / testIssues.length) * 100).toFixed(1)}%`);
  }

  /**
   * Save test results for cleanup
   */
  private saveTestResults(): void {
    fs.writeFileSync(
      '.test-auditing.json',
      JSON.stringify(this.testResults, null, 2)
    );
    console.log(`\n💾 Saved test results to .test-auditing.json`);
  }

  /**
   * Run the complete test
   */
  async run(): Promise<void> {
    try {
      console.log(`🧪 Auditing Feature Test`);
      console.log(`════════════════════════════════════════`);
      console.log(`Repository: ${this.config.owner}/${this.config.repo}`);
      console.log(`Dry Run: ${this.config.dryRun}`);
      
      // Create test project
      const project = await this.createTestProject();
      this.testResults.projectNumber = project.projectNumber;
      this.testResults.projectId = project.projectId;
      
      // Create test issues
      const testIssues = await this.createTestIssues(project);
      
      // Run the auditing script
      await this.runAuditingScript(project.projectNumber);
      
      // Verify results
      await this.verifyResults(testIssues, project);
      
      // Save results for cleanup
      this.saveTestResults();
      
      console.log(`\n✅ Test complete!`);
      console.log(`\n🔍 View project: https://github.com/${this.config.owner === 'recursivesquircle' ? 'users' : 'orgs'}/${this.config.owner}/projects/${project.projectNumber}`);
      console.log(`🔍 View issues: https://github.com/${this.config.owner}/${this.config.repo}/issues?q=is:issue+label:test`);
      console.log(`\n🧹 Clean up when done:`);
      console.log(`   npm run issue-mgmt:test:cleanup-auditing`);
      
    } catch (error) {
      console.error(`\n❌ Test failed:`, error);
      
      // Save partial results for cleanup
      if (this.testResults.issues.length > 0 || this.testResults.projectId) {
        this.saveTestResults();
        console.log(`\n💾 Saved partial results for cleanup`);
      }
      
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
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

  const config: TestConfig = {
    token,
    owner,
    repo,
    dryRun,
  };

  const runner = new AuditingTestRunner(config);
  await runner.run();
}

if (require.main === module) {
  main();
}
