import 'dotenv/config';
import { IssueManager } from './IssueManager';

/**
 * Shared types and interfaces for issue management
 */

export interface IssueData {
  number: number;
  title: string;
  assignees: Array<{ login: string }>;
  updated_at: string;
  created_at: string;
  html_url: string;
  labels: Array<{ name: string }>;
  node_id: string;
}

export interface ProjectFieldOption {
  id: string;
  name: string;
}

export interface ProjectField {
  id: string;
  name: string;
  options?: ProjectFieldOption[];
}

export interface ProjectItemStatus {
  itemId?: string;
  statusValue?: string;
}

export interface Config {
  owner: string;
  repo: string;
  warningWeeks: number;
  unassignWeeks: number;
  dryRun: boolean;
  timeUnit: 'weeks' | 'minutes' | 'seconds';
  projectNumber?: number;
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
    const projectNumber = process.env.PROJECT_NUMBER ? parseInt(process.env.PROJECT_NUMBER, 10) : undefined;

    const config: Config = {
      owner,
      repo,
      warningWeeks: parseFloat(process.env.WARNING_WEEKS || '1'),
      unassignWeeks: parseFloat(process.env.UNASSIGN_WEEKS || '2'),
      dryRun,
      timeUnit,
      projectNumber,
    };

    const manager = new IssueManager(token, config);
    await manager.processIssues();
    
    console.log('\n✅ Issue management completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}
