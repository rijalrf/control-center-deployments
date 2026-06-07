"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReposController = void 0;
const Repository_1 = require("../models/Repository");
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
            if (!userToken) {
                res.status(401).json({ error: 'GitHub access token not found' });
                return;
            }
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
}
exports.ReposController = ReposController;
