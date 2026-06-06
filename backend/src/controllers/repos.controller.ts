import { Request, Response, NextFunction } from 'express';
import { Repository } from '../models/Repository';
import { GitHubService } from '../services/github.service';

export class ReposController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const repos = await Repository.findAll({ order: [['name', 'ASC']] });
      res.json(repos);
    } catch (err) {
      next(err);
    }
  }

  static async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const userToken = (req.user as any)?.access_token || null;
      const results = await GitHubService.syncRepositories(userToken);
      res.json({ synced: results.length, repositories: results });
    } catch (err: any) {
      if (err.status === 401 || err.statusCode === 401) {
        err.status = 502;
        err.message = `GitHub API Authentication Failed (Bad Credentials): ${err.message}`;
      }
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const repo = await Repository.findByPk(req.params.id);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      await repo.destroy();
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  static async getEnvKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const repo = await Repository.findByPk(req.params.id);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const userToken = (req.user as any)?.access_token || null;
      if (!userToken) {
        return res.status(401).json({ error: 'GitHub access token not found' });
      }

      const [owner, repoName] = repo.full_name.split('/');
      if (!owner || !repoName) {
        return res.status(400).json({ error: 'Invalid repository name format' });
      }

      const keys = await GitHubService.getRepoEnvKeys(userToken, owner, repoName);
      res.json({ keys });
    } catch (err) {
      next(err);
    }
  }
}
