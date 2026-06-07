"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReposController = void 0;
const Repository_1 = require("../models/Repository");
const Environment_1 = require("../models/Environment");
const github_service_1 = require("../services/github.service");
class ReposController {
    static async list(_req, res, next) {
        try {
            const repos = await Repository_1.Repository.findAll({ order: [['name', 'ASC']] });
            res.json(repos);
        }
        catch (err) {
            next(err);
        }
    }
    static async sync(req, res, next) {
        try {
            const userToken = req.user?.access_token ?? null;
            const results = await github_service_1.GitHubService.syncRepositories(userToken);
            res.json({ synced: results.length, repositories: results });
        }
        catch (err) {
            // Surface GitHub 401 as a 502 (bad credentials from upstream)
            if (err &&
                typeof err === 'object' &&
                ('status' in err || 'statusCode' in err) &&
                (err.status === 401 ||
                    err.statusCode === 401)) {
                const typedErr = err;
                typedErr.status = 502;
                typedErr.message = `GitHub API Authentication Failed (Bad Credentials): ${typedErr.message}`;
            }
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            const repo = await Repository_1.Repository.findByPk(req.params.id);
            if (!repo) {
                res.status(404).json({ error: 'Repository not found' });
                return;
            }
            await repo.destroy();
            res.json({ message: 'Deleted' });
        }
        catch (err) {
            next(err);
        }
    }
    static async getEnvKeys(req, res, next) {
        try {
            const repo = await Repository_1.Repository.findByPk(req.params.id);
            if (!repo) {
                res.status(404).json({ error: 'Repository not found' });
                return;
            }
            const userToken = req.user?.access_token ?? null;
            const [owner, repoName] = repo.full_name.split('/');
            if (!owner || !repoName) {
                res.status(400).json({ error: 'Invalid repository name format' });
                return;
            }
            const keys = await github_service_1.GitHubService.getRepoEnvKeys(userToken, owner, repoName);
            res.json({ keys });
        }
        catch (err) {
            next(err);
        }
    }
    static async validateBranches(req, res, next) {
        try {
            const { environment_id, repositories } = req.body;
            if (!environment_id || !repositories?.length) {
                res.status(400).json({ error: 'environment_id and repositories are required' });
                return;
            }
            const envObj = await Environment_1.Environment.findByPk(environment_id);
            const configuredBranch = envObj?.target_branch?.trim() || '';
            const envName = envObj?.name ?? 'staging';
            const userToken = req.user?.access_token ?? null;
            const results = await Promise.all(repositories.map(async (repo) => {
                const [repoOwner, repoNameOnly] = repo.full_name.split('/');
                let desiredBranch = configuredBranch;
                if (!desiredBranch) {
                    desiredBranch = envName.toLowerCase() === 'production' ? 'main' : 'staging';
                }
                let branchExists = false;
                try {
                    branchExists = await github_service_1.GitHubService.checkBranchExists(userToken, repoOwner, repoNameOnly, desiredBranch);
                }
                catch (err) {
                    // ignore
                }
                const resolvedBranch = branchExists ? desiredBranch : repo.default_branch;
                // Search for Dockerfile in common locations
                let dockerfilePath = null;
                try {
                    dockerfilePath = await github_service_1.GitHubService.findFile(userToken, repoOwner, repoNameOnly, 'Dockerfile', resolvedBranch);
                }
                catch (err) {
                    // ignore
                }
                // Search for docker-compose.yml / .yaml in common locations (same logic as Dockerfile)
                let dockerComposePath = null;
                try {
                    dockerComposePath = await github_service_1.GitHubService.findFile(userToken, repoOwner, repoNameOnly, ['docker-compose.yml', 'docker-compose.yaml'], resolvedBranch);
                }
                catch (err) {
                    // ignore
                }
                return {
                    repository_id: repo.id,
                    desired_branch: desiredBranch,
                    exists: branchExists,
                    resolved_branch: resolvedBranch,
                    fallback_used: !branchExists,
                    dockerfile_exists: dockerfilePath !== null,
                    dockerfile_path: dockerfilePath,
                    docker_compose_exists: dockerComposePath !== null,
                    docker_compose_path: dockerComposePath,
                };
            }));
            res.json({ results });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReposController = ReposController;
