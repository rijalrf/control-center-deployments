import { Request, Response, NextFunction } from 'express';
import { Repository } from '../models/Repository';
import { GitHubService } from '../services/github.service';
import { getErrorMessage } from '../utils/errors';

export class ReposController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const repos = await Repository.findAll({ order: [['name', 'ASC']] });
      res.json(repos);
    } catch (err) {
      next(err);
    }
  }

  static async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userToken = req.user?.access_token ?? null;
      const results   = await GitHubService.syncRepositories(userToken);
      res.json({ synced: results.length, repositories: results });
    } catch (err: unknown) {
      // Surface GitHub 401 as a 502 (bad credentials from upstream)
      if (
        err &&
        typeof err === 'object' &&
        ('status' in err || 'statusCode' in err) &&
        ((err as { status?: number }).status === 401 ||
          (err as { statusCode?: number }).statusCode === 401)
      ) {
        const typedErr = err as { status?: number; statusCode?: number; message: string };
        typedErr.status = 502;
        typedErr.message = `GitHub API Authentication Failed (Bad Credentials): ${typedErr.message}`;
      }
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = await Repository.findByPk(req.params.id);
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }
      await repo.destroy();
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  static async getEnvKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = await Repository.findByPk(req.params.id);
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

      const keys = await GitHubService.getRepoEnvKeys(userToken, owner, repoName);
      res.json({ keys });
    } catch (err) {
      next(err);
    }
  }
}
