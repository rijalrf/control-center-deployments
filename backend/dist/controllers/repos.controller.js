"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReposController = void 0;
const Repository_1 = require("../models/Repository");
const github_service_1 = require("../services/github.service");
class ReposController {
    static async list(req, res, next) {
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
            const userToken = req.user?.access_token || null;
            const results = await github_service_1.GitHubService.syncRepositories(userToken);
            res.json({ synced: results.length, repositories: results });
        }
        catch (err) {
            if (err.status === 401 || err.statusCode === 401) {
                err.status = 502;
                err.message = `GitHub API Authentication Failed (Bad Credentials): ${err.message}`;
            }
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            const repo = await Repository_1.Repository.findByPk(req.params.id);
            if (!repo) {
                return res.status(404).json({ error: 'Repository not found' });
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
                return res.status(404).json({ error: 'Repository not found' });
            }
            const userToken = req.user?.access_token || null;
            if (!userToken) {
                return res.status(401).json({ error: 'GitHub access token not found' });
            }
            const [owner, repoName] = repo.full_name.split('/');
            if (!owner || !repoName) {
                return res.status(400).json({ error: 'Invalid repository name format' });
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
