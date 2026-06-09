"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReposController = void 0;
const yaml = __importStar(require("js-yaml"));
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
    static async getComposeServices(req, res, next) {
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
            const branch = req.query.branch || repo.default_branch || 'main';
            let composePath = req.query.path || null;
            if (!composePath) {
                try {
                    composePath = await github_service_1.GitHubService.findFile(userToken, owner, repoName, ['docker-compose.yml', 'docker-compose.yaml'], branch);
                }
                catch (err) {
                    // ignore
                }
            }
            if (!composePath) {
                res.status(404).json({ error: 'docker-compose.yml not found in this repository' });
                return;
            }
            const rawYaml = await github_service_1.GitHubService.getFileContent(userToken, owner, repoName, composePath, branch);
            const doc = yaml.load(rawYaml);
            if (!doc || typeof doc !== 'object' || !doc.services || typeof doc.services !== 'object') {
                res.status(400).json({ error: 'Invalid docker-compose file structure (missing services)' });
                return;
            }
            const servicesList = Object.keys(doc.services).map((serviceName) => {
                const serviceObj = doc.services[serviceName];
                const image = serviceObj?.image || '';
                let currentTag = null;
                let suggestedTag = 'v1';
                if (image && typeof image === 'string') {
                    const parts = image.split(':');
                    const lastPart = parts[parts.length - 1];
                    if (parts.length > 1 && !lastPart.includes('/')) {
                        currentTag = lastPart;
                        const match = currentTag.match(/^(.*?)(\d+)$/);
                        if (match) {
                            const prefix = match[1];
                            const num = parseInt(match[2], 10);
                            suggestedTag = `${prefix}${num + 1}`;
                        }
                        else {
                            const semverMatch = currentTag.match(/^(v?\d+\.\d+\.)(\d+)$/);
                            if (semverMatch) {
                                const prefix = semverMatch[1];
                                const patch = parseInt(semverMatch[2], 10);
                                suggestedTag = `${prefix}${patch + 1}`;
                            }
                            else {
                                suggestedTag = `${currentTag}-next`;
                            }
                        }
                    }
                }
                return {
                    name: serviceName,
                    image,
                    current_tag: currentTag,
                    suggested_tag: suggestedTag,
                };
            });
            res.json({
                compose_path: composePath,
                services: servicesList,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getContents(req, res, next) {
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
            const branch = req.query.branch || repo.default_branch || 'main';
            const path = req.query.path || '';
            const contents = await github_service_1.GitHubService.getRepoContents(userToken, owner, repoName, path, branch);
            res.json(contents);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReposController = ReposController;
