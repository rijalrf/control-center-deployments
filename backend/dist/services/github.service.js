"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const rest_1 = require("@octokit/rest");
const env_1 = require("../config/env");
const Repository_1 = require("../models/Repository");
// ── Service ───────────────────────────────────────────────────────────────────
class GitHubService {
    static getEffectiveToken(accessToken) {
        const configToken = env_1.env.github.token;
        if (configToken &&
            configToken !== 'your_github_personal_access_token' &&
            configToken.trim() !== '') {
            return configToken;
        }
        if (!accessToken) {
            throw new Error('GitHub access token is required.');
        }
        return accessToken;
    }
    static async syncRepositories(accessToken) {
        const token = this.getEffectiveToken(accessToken);
        const org = env_1.env.github.org && env_1.env.github.org !== 'your_github_org_or_username'
            ? env_1.env.github.org
            : null;
        const octokit = new rest_1.Octokit({ auth: token });
        let ghRepos = [];
        if (org) {
            const { data } = await octokit.repos.listForOrg({ org, type: 'all', per_page: 100 });
            ghRepos = data;
        }
        else {
            const { data } = await octokit.repos.listForAuthenticatedUser({ visibility: 'all', per_page: 100 });
            ghRepos = data;
        }
        const now = new Date();
        const results = await Promise.all(ghRepos.map(async (r) => {
            const [repo] = await Repository_1.Repository.upsert({
                github_id: String(r.id),
                name: r.name,
                full_name: r.full_name,
                description: r.description,
                url: r.html_url,
                clone_url: r.clone_url,
                language: r.language,
                default_branch: r.default_branch,
                visibility: r.visibility ?? 'private',
                synced_at: now,
            });
            return repo;
        }));
        return results;
    }
    static async dispatchCentralWorkflow(accessToken, targetInputs, ref = 'main') {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        let owner = env_1.env.central.owner;
        if (!owner) {
            const { data: user } = await octokit.users.getAuthenticated();
            owner = user.login;
        }
        const repo = env_1.env.central.repo || 'control-center-deployments';
        const workflowId = env_1.env.central.workflow || 'central-deploy.yml';
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
    static async findWorkflowRun(accessToken, owner, repo, workflowId, afterTime) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
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
        return run ?? null;
    }
    static async getWorkflowRunStatus(accessToken, owner, repo, runId) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        const { data } = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
        return {
            status: data.status,
            conclusion: data.conclusion,
            html_url: data.html_url,
        };
    }
    static async getWorkflowRunJobs(accessToken, owner, repo, runId) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        const { data } = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id: runId });
        return data.jobs;
    }
    static async getJobLogs(accessToken, owner, repo, jobId) {
        try {
            const token = this.getEffectiveToken(accessToken);
            const octokit = new rest_1.Octokit({ auth: token });
            const { data } = await octokit.actions.downloadJobLogsForWorkflowRun({
                owner,
                repo,
                job_id: jobId,
            });
            return typeof data === 'string' ? data : JSON.stringify(data);
        }
        catch (e) {
            return `Tidak dapat mengambil log dari GitHub API: ${e instanceof Error ? e.message : String(e)}`;
        }
    }
    static async getRepoEnvKeys(accessToken, owner, repo) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        let content = '';
        // Try .env.example first, fall back to .env
        for (const path of ['.env.example', '.env']) {
            try {
                const { data } = await octokit.repos.getContent({ owner, repo, path });
                if (data && 'content' in data) {
                    content = Buffer.from(data.content, 'base64').toString('utf-8');
                    break;
                }
            }
            catch {
                // continue to next path
            }
        }
        if (!content)
            return [];
        const keys = [];
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
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
    static async checkBranchExists(accessToken, owner, repo, branch) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        try {
            await octokit.repos.getBranch({ owner, repo, branch });
            return true;
        }
        catch {
            return false;
        }
    }
    static async getFileContent(accessToken, owner, repo, path, ref) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
        if (data && 'content' in data && typeof data.content === 'string') {
            return Buffer.from(data.content, 'base64').toString('utf-8');
        }
        throw new Error('File has no content or is a directory');
    }
    /**
     * Search for a file in multiple candidate paths (root first, then common subdirs).
     * Accepts one filename or multiple variants (e.g. ['docker-compose.yml', 'docker-compose.yaml']).
     * Each variant is tried with its original case AND lowercase per directory.
     * Returns the path where the file was found, or null if not found anywhere.
     */
    static async findFile(accessToken, owner, repo, filename, ref, extraPaths = []) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        const names = Array.isArray(filename) ? filename : [filename];
        const dirs = [
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
        const candidates = [];
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
            }
            catch {
                // not at this path, continue
            }
        }
        return null;
    }
    static async getRepoContents(accessToken, owner, repo, path, ref) {
        const token = this.getEffectiveToken(accessToken);
        const octokit = new rest_1.Octokit({ auth: token });
        const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
        if (Array.isArray(data)) {
            return data.map(item => ({
                name: item.name,
                path: item.path,
                type: item.type, // 'file' or 'dir'
                size: item.size
            }));
        }
        return [];
    }
}
exports.GitHubService = GitHubService;
