import { Request, Response, NextFunction } from 'express';
import { Environment } from '../models/Environment';
import { Server } from '../models/Server';
import { getErrorMessage } from '../utils/errors';

// Sorts environments: dev → qa/staging → prod → others
function getEnvSortPriority(slug: string): number {
  const s = slug.toLowerCase();
  if (s.includes('dev'))                                             return 1;
  if (s.includes('qa') || s.includes('staging') || s.includes('test')) return 2;
  if (s.includes('prod') || s.includes('production'))               return 3;
  return 99;
}

export class EnvironmentsController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const envs = await Environment.findAll({
        include: [{ model: Server, as: 'servers' }],
      });

      envs.sort((a, b) => getEnvSortPriority(a.slug) - getEnvSortPriority(b.slug));
      res.json(envs);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, slug, description, color } = req.body as {
        name: string;
        slug: string;
        description?: string;
        color?: string;
      };

      if (!name || !slug) {
        res.status(400).json({ error: 'name and slug are required' });
        return;
      }

      const env = await Environment.create({
        name,
        slug,
        description: description ?? null,
        color: color ?? '#06b6d4',
      });
      res.status(201).json(env);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'SequelizeUniqueConstraintError') {
        res.status(409).json({ error: 'Slug already exists' });
        return;
      }
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const env = await Environment.findByPk(req.params.id);
      if (!env) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const { name, slug, description, color } = req.body as {
        name?: string;
        slug?: string;
        description?: string;
        color?: string;
      };
      await env.update({ name, slug, description, color });
      res.json(env);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const env = await Environment.findByPk(req.params.id);
      if (!env) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await env.destroy();
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }
}
