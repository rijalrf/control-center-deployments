import { Octokit } from '@octokit/rest';
import { env } from '../config/env';
import { Repository } from '../models/Repository';

export class GitHubService {
  static async syncRepositories(accessToken: string | null) {
    let token = accessToken;
    if (!token && env.github.token && env.github.token !== 'your_github_personal_access_token') {
      token = env.github.token;
    }
    
    const org = env.github.org && env.github.org !== 'your_github_org_or_username' ? env.github.org : null;

    if (!token) {
      throw new Error('GitHub access token is required for synchronization.');
    }

    const octokit = new Octokit({ auth: token });
    let ghRepos: any[] = [];

    if (org) {
      const { data } = await octokit.repos.listForOrg({
        org,
        type: 'all',
        per_page: 100,
      });
      ghRepos = data;
    } else {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        visibility: 'all',
        per_page: 100,
      });
      ghRepos = data;
    }

    const now = new Date();
    const results = await Promise.all(
      ghRepos.map(async (r: any) => {
        const [repo] = await Repository.upsert({
          github_id: String(r.id),
          name: r.name,
          full_name: r.full_name,
          description: r.description,
          url: r.html_url,
          clone_url: r.clone_url,
          language: r.language,
          default_branch: r.default_branch,
          visibility: r.visibility || 'private',
          synced_at: now,
        });
        return repo;
      })
    );

    return results;
  }

  static async dispatchCentralWorkflow(accessToken: string, targetInputs: Record<string, string>) {
    const octokit = new Octokit({ auth: accessToken });
    
    let owner = env.central.owner;
    if (!owner) {
      const { data: user } = await octokit.users.getAuthenticated();
      owner = user.login;
    }
    
    const repo = env.central.repo || 'center-control-deployments';
    const workflowId = env.central.workflow || 'central-deploy.yml';

    const dispatchTime = new Date();
    
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref: 'main',
      inputs: targetInputs,
    });

    return { owner, repo, workflowId, dispatchTime };
  }

  static async findWorkflowRun(accessToken: string, owner: string, repo: string, workflowId: string, afterTime: Date) {
    const octokit = new Octokit({ auth: accessToken });
    const { data } = await octokit.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      event: 'workflow_dispatch',
      per_page: 5,
    });
    
    const run = data.workflow_runs.find((r: any) => {
      const runTime = new Date(r.created_at);
      // Allow a 30s buffer for potential clock differences
      return runTime.getTime() > afterTime.getTime() - 30000;
    });
    
    return run || null;
  }

  static async getWorkflowRunStatus(accessToken: string, owner: string, repo: string, runId: number) {
    const octokit = new Octokit({ auth: accessToken });
    const { data } = await octokit.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    return {
      status: data.status, // queued, in_progress, completed
      conclusion: data.conclusion, // success, failure, cancelled, timed_out
      html_url: data.html_url,
    };
  }

  static async getWorkflowRunJobs(accessToken: string, owner: string, repo: string, runId: number) {
    const octokit = new Octokit({ auth: accessToken });
    const { data } = await octokit.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    return data.jobs;
  }

  static async getJobLogs(accessToken: string, owner: string, repo: string, jobId: number) {
    try {
      const octokit = new Octokit({ auth: accessToken });
      const { data } = await octokit.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: jobId,
      });
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (e: any) {
      return `Tidak dapat mengambil log dari GitHub API: ${e.message}`;
    }
  }
}
