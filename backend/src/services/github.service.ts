import { Octokit } from '@octokit/rest';
import { env } from '../config/env';
import { Repository } from '../models/Repository';

// ── Internal GitHub API types ─────────────────────────────────────────────────

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  language: string | null;
  default_branch: string;
  visibility?: string;
}

interface WorkflowRun {
  id: number;
  status: string | null;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

interface WorkflowJob {
  id: number;
  html_url: string | null;
  steps?: WorkflowStep[];
}

interface WorkflowStep {
  name: string;
  number: number;
  status: string | null;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class GitHubService {
  private static getEffectiveToken(accessToken: string | null): string {
    const configToken = env.github.token;
    if (
      configToken &&
      configToken !== 'your_github_personal_access_token' &&
      configToken.trim() !== ''
    ) {
      return configToken;
    }
    if (!accessToken) {
      throw new Error('GitHub access token is required.');
    }
    return accessToken;
  }

  static async syncRepositories(accessToken: string | null): Promise<Repository[]> {
    const token    = this.getEffectiveToken(accessToken);
    const org      = env.github.org && env.github.org !== 'your_github_org_or_username'
      ? env.github.org
      : null;
    const octokit  = new Octokit({ auth: token });

    let ghRepos: GitHubRepo[] = [];

    if (org) {
      const { data } = await octokit.repos.listForOrg({ org, type: 'all', per_page: 100 });
      ghRepos = data as GitHubRepo[];
    } else {
      const { data } = await octokit.repos.listForAuthenticatedUser({ visibility: 'all', per_page: 100 });
      ghRepos = data as GitHubRepo[];
    }

    const now     = new Date();
    const results = await Promise.all(
      ghRepos.map(async (r) => {
        const [repo] = await Repository.upsert({
          github_id:      String(r.id),
          name:           r.name,
          full_name:      r.full_name,
          description:    r.description,
          url:            r.html_url,
          clone_url:      r.clone_url,
          language:       r.language,
          default_branch: r.default_branch,
          visibility:     r.visibility ?? 'private',
          synced_at:      now,
        });
        return repo;
      }),
    );

    return results;
  }

  static async dispatchCentralWorkflow(
    accessToken: string,
    targetInputs: Record<string, string>,
    ref = 'main',
  ): Promise<{ owner: string; repo: string; workflowId: string; dispatchTime: Date }> {
    const token   = this.getEffectiveToken(accessToken);
    const octokit = new Octokit({ auth: token });

    let owner = env.central.owner;
    if (!owner) {
      const { data: user } = await octokit.users.getAuthenticated();
      owner = user.login;
    }

    const repo       = env.central.repo || 'control-center-deployments';
    const workflowId = env.central.workflow || 'central-deploy.yml';
    const dispatchTime = new Date();

    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
      inputs: targetInputs,
    });

    return { owner, repo, workflowId, dispatchTime };
  }

  static async findWorkflowRun(
    accessToken: string,
    owner: string,
    repo: string,
    workflowId: string,
    afterTime: Date,
  ): Promise<WorkflowRun | null> {
    const token   = this.getEffectiveToken(accessToken);
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      event: 'workflow_dispatch',
      per_page: 5,
    });

    const run = data.workflow_runs.find((r) => {
      const runTime = new Date(r.created_at);
      // Allow a 30s buffer for potential clock differences
      return runTime.getTime() > afterTime.getTime() - 30_000;
    });

    return (run as WorkflowRun | undefined) ?? null;
  }

  static async getWorkflowRunStatus(
    accessToken: string,
    owner: string,
    repo: string,
    runId: number,
  ): Promise<{ status: string | null; conclusion: string | null; html_url: string }> {
    const token    = this.getEffectiveToken(accessToken);
    const octokit  = new Octokit({ auth: token });
    const { data } = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
    return {
      status:     data.status,
      conclusion: data.conclusion,
      html_url:   data.html_url,
    };
  }

  static async getWorkflowRunJobs(
    accessToken: string,
    owner: string,
    repo: string,
    runId: number,
  ): Promise<WorkflowJob[]> {
    const token    = this.getEffectiveToken(accessToken);
    const octokit  = new Octokit({ auth: token });
    const { data } = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id: runId });
    return data.jobs as WorkflowJob[];
  }

  static async getJobLogs(
    accessToken: string,
    owner: string,
    repo: string,
    jobId: number,
  ): Promise<string> {
    try {
      const token    = this.getEffectiveToken(accessToken);
      const octokit  = new Octokit({ auth: token });
      const { data } = await octokit.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: jobId,
      });
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (e: unknown) {
      return `Tidak dapat mengambil log dari GitHub API: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  static async getRepoEnvKeys(
    accessToken: string | null,
    owner: string,
    repo: string,
  ): Promise<string[]> {
    const token   = this.getEffectiveToken(accessToken);
    const octokit = new Octokit({ auth: token });
    let content   = '';

    // Try .env.example first, fall back to .env
    for (const path of ['.env.example', '.env']) {
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path });
        if (data && 'content' in data) {
          content = Buffer.from(data.content, 'base64').toString('utf-8');
          break;
        }
      } catch {
        // continue to next path
      }
    }

    if (!content) return [];

    const keys: string[] = [];
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)/);
      if (match) {
        const key = match[1].trim();
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          keys.push(key);
        }
      }
    }

    return keys;
  }

  static async checkBranchExists(
    accessToken: string | null,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<boolean> {
    const token   = this.getEffectiveToken(accessToken);
    const octokit = new Octokit({ auth: token });
    try {
      await octokit.repos.getBranch({ owner, repo, branch });
      return true;
    } catch {
      return false;
    }
  }

  static async getFileContent(
    accessToken: string | null,
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<string> {
    const token   = this.getEffectiveToken(accessToken);
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
    if (data && 'content' in data && typeof (data as any).content === 'string') {
      return Buffer.from((data as any).content, 'base64').toString('utf-8');
    }
    throw new Error('File has no content or is a directory');
  }

  /**
   * Search for a file in multiple candidate paths (root first, then common subdirs).
   * Accepts one filename or multiple variants (e.g. ['docker-compose.yml', 'docker-compose.yaml']).
   * Each variant is tried with its original case AND lowercase per directory.
   * Returns the path where the file was found, or null if not found anywhere.
   */
  static async findFile(
    accessToken: string | null,
    owner: string,
    repo: string,
    filename: string | string[],
    ref: string,
    extraPaths: string[] = [],
  ): Promise<string | null> {
    const token   = this.getEffectiveToken(accessToken);
    const octokit = new Octokit({ auth: token });

    const names = Array.isArray(filename) ? filename : [filename];
    const dirs  = [
      '', 
      '.docker/', 
      '.dokcer/', 
      'docker/', 
      'deploy/', 
      'deployment/', 
      'infra/', 
      'infrastructure/', 
      'config/', 
      'dockerfiles/', 
      '.dockerfiles/'
    ];

    // Build candidate list: for each dir, try each name variant + its lowercase
    const candidates: string[] = [];
    for (const dir of dirs) {
      for (const name of names) {
        candidates.push(`${dir}${name}`);
        const lower = name.toLowerCase();
        if (lower !== name) {
          candidates.push(`${dir}${lower}`);
        }
      }
    }
    candidates.push(...extraPaths);

    for (const path of candidates) {
      try {
        await octokit.repos.getContent({ owner, repo, path, ref });
        return path; // found!
      } catch {
        // not at this path, continue
      }
    }
    return null;
  }
}
