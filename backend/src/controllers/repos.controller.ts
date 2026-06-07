import { Request, Response, NextFunction } from 'express';
import { Repository } from '../models/Repository';
import { Environment } from '../models/Environment';
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

  static async validateBranches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { environment_id, repositories } = req.body as {
        environment_id: number;
        repositories: { id: number; name: string; full_name: string; default_branch: string; clone_url: string }[];
      };

      if (!environment_id || !repositories?.length) {
        res.status(400).json({ error: 'environment_id and repositories are required' });
        return;
      }

      const envObj = await Environment.findByPk(environment_id);
      const configuredBranch = envObj?.target_branch?.trim() || '';
      const envName = envObj?.name ?? 'staging';

      const userToken = req.user?.access_token ?? null;

      const results = await Promise.all(
        repositories.map(async (repo) => {
          const [repoOwner, repoNameOnly] = repo.full_name.split('/');
          
          let desiredBranch = configuredBranch;
          if (!desiredBranch) {
            desiredBranch = envName.toLowerCase() === 'production' ? 'main' : 'staging';
          }

          let branchExists = false;
          try {
            branchExists = await GitHubService.checkBranchExists(userToken, repoOwner, repoNameOnly, desiredBranch);
          } catch (err) {
            // ignore
          }

          return {
            repository_id: repo.id,
            desired_branch: desiredBranch,
            exists: branchExists,
            resolved_branch: branchExists ? desiredBranch : repo.default_branch,
            fallback_used: !branchExists,
          };
        })
      );

      res.json({ results });
    } catch (err) {
      next(err);
    }
  }
}
