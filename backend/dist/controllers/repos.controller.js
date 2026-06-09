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
const Deployment_1 = require("../models/Deployment");
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
            // Fetch successful deployments ordered by id desc
            let isProduction = false;
            const envIdQuery = req.query.environment_id ? parseInt(req.query.environment_id, 10) : null;
            if (envIdQuery) {
                const env = await Environment_1.Environment.findByPk(envIdQuery);
                if (env && (env.name.toLowerCase() === 'production' || env.slug.toLowerCase() === 'production' || env.name.toLowerCase() === 'prod' || env.slug.toLowerCase() === 'prod')) {
                    isProduction = true;
                }
            }
            else {
                if (branch === 'main' || branch === 'master') {
                    isProduction = true;
                }
            }
            // Fetch successful deployments ordered by id desc
            const successfulDeployments = await Deployment_1.Deployment.findAll({
                where: { status: 'success' },
                order: [['id', 'DESC']],
            });
            // Filter deployments containing this repository and extract their VERSION_TAG
            const recentTagsSet = new Set();
            for (const d of successfulDeployments) {
                if (recentTagsSet.size >= 10)
                    break;
                if (d.repositories && Array.isArray(d.repositories) && d.repositories.some((r) => String(r.id) === String(repo.id))) {
                    if (d.config) {
                        const repoConfig = d.config[repo.name];
                        if (repoConfig && repoConfig['VERSION_TAG']) {
                            let tag = repoConfig['VERSION_TAG'];
                            if (isProduction) {
                                // Normalize tag to 1 digit
                                const match = tag.match(/^(v?)(\d+)/i);
                                if (match) {
                                    tag = `${match[1] || ''}${match[2]}`;
                                }
                            }
                            else {
                                // Normalize tag if it's single digit (e.g. "v1" -> "v1.0.0")
                                const singleDigitMatch = tag.match(/^(v?)(\d+)$/i);
                                if (singleDigitMatch) {
                                    const prefix = singleDigitMatch[1] || 'v';
                                    tag = `${prefix}${singleDigitMatch[2]}.0.0`;
                                }
                            }
                            recentTagsSet.add(tag);
                        }
                    }
                }
            }
            const recentTags = Array.from(recentTagsSet);
            const dbTag = recentTags[0] || null; // The latest successful tag
            const servicesList = Object.keys(doc.services).map((serviceName) => {
                const serviceObj = doc.services[serviceName];
                const image = serviceObj?.image || '';
                let currentTag = null;
                let suggestedTag = isProduction ? 'v1' : 'v1.0.0';
                // 1. Get tag from Git image if present
                if (image && typeof image === 'string') {
                    const parts = image.split(':');
                    const lastPart = parts[parts.length - 1];
                    if (parts.length > 1 && !lastPart.includes('/')) {
                        currentTag = lastPart;
                    }
                }
                // 2. Override/Prioritize database tag if available
                if (dbTag) {
                    currentTag = dbTag;
                }
                // 3. Increment logic
                if (currentTag) {
                    if (isProduction) {
                        // Normalize currentTag to 1-digit for production (e.g. "v1.0.0" -> "v1", "1.0.0" -> "1")
                        const match = currentTag.match(/^(v?)(\d+)/i);
                        if (match) {
                            const prefix = match[1] || '';
                            const major = parseInt(match[2], 10);
                            currentTag = `${prefix}${major}`;
                            suggestedTag = `${prefix}${major + 1}`;
                        }
                        else {
                            suggestedTag = `${currentTag}-next`;
                        }
                    }
                    else {
                        // Normalize currentTag if it's single digit (e.g. "v1" -> "v1.0.0")
                        let normalizedTag = currentTag;
                        const singleDigitMatch = currentTag.match(/^(v?)(\d+)$/i);
                        if (singleDigitMatch) {
                            const prefix = singleDigitMatch[1] || 'v';
                            normalizedTag = `${prefix}${singleDigitMatch[2]}.0.0`;
                            currentTag = normalizedTag; // update current tag display to 3 digits!
                        }
                        const semverRegex = /^(v?)(\d+)\.(\d+)\.(\d+)(.*)$/i;
                        const semverMatch = normalizedTag.match(semverRegex);
                        if (semverMatch) {
                            const prefix = semverMatch[1];
                            const major = parseInt(semverMatch[2], 10);
                            const minor = parseInt(semverMatch[3], 10);
                            const patch = parseInt(semverMatch[4], 10);
                            const suffix = semverMatch[5] || '';
                            suggestedTag = `${prefix}${major}.${minor}.${patch + 1}${suffix}`;
                        }
                        else {
                            // Fallback for non-standard tag formats
                            const generalMatch = normalizedTag.match(/^(.*?)(\d+)$/);
                            if (generalMatch) {
                                const prefix = generalMatch[1];
                                const num = parseInt(generalMatch[2], 10);
                                suggestedTag = `${prefix}${num + 1}`;
                            }
                            else {
                                suggestedTag = `${normalizedTag}-next`;
                            }
                        }
                    }
                }
                else {
                    suggestedTag = isProduction ? 'v1' : 'v1.0.0';
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
                recent_tags: recentTags,
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
