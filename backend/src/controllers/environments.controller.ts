import { Request, Response, NextFunction } from 'express';
import { Environment } from '../models/Environment';
import { Server } from '../models/Server';
import { getErrorMessage } from '../utils/errors';

export const STATIC_ENVIRONMENTS = [
  {
    id: 1,
    name: 'non production #1',
    slug: 'non-production-1',
    description: 'Environment Non-Production 1',
    color: '#3b82f6',
  },
  {
    id: 2,
    name: 'non production #2',
    slug: 'non-production-2',
    description: 'Environment Non-Production 2',
    color: '#06b6d4',
  },
  {
    id: 3,
    name: 'production',
    slug: 'production',
    description: 'Environment Production',
    color: '#ef4444',
  }
];

// Sorts environments: dev → qa/staging → prod → others
function getEnvSortPriority(slug: string): number {
  const s = slug.toLowerCase();
  if (s.includes('non-production-1')) return 1;
  if (s.includes('non-production-2')) return 2;
  if (s.includes('prod') || s.includes('production')) return 3;
  return 99;
}

export class EnvironmentsController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const servers = await Server.findAll();
      const envs = STATIC_ENVIRONMENTS.map(env => ({
        ...env,
        servers: servers.filter(s => s.environment_id === env.id).map(s => s.get({ plain: true }))
      }));

      envs.sort((a, b) => getEnvSortPriority(a.slug) - getEnvSortPriority(b.slug));
      res.json(envs);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.status(400).json({ error: 'Environments are static and cannot be created' });
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.status(400).json({ error: 'Environments are static and cannot be modified' });
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.status(400).json({ error: 'Environments are static and cannot be deleted' });
  }
}
