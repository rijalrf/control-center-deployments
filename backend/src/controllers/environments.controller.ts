import { Request, Response, NextFunction } from 'express';
import { Environment } from '../models/Environment';
import { Server } from '../models/Server';

export class EnvironmentsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const envs = await Environment.findAll({
        include: [{ model: Server, as: 'servers' }],
      });

      const getEnvPriority = (slug: string) => {
        const s = slug.toLowerCase();
        if (s.includes('dev')) return 1;
        if (s.includes('qa') || s.includes('staging') || s.includes('test')) return 2;
        if (s.includes('prod') || s.includes('production')) return 3;
        return 99;
      };

      envs.sort((a, b) => getEnvPriority(a.slug) - getEnvPriority(b.slug));

      res.json(envs);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, slug, description, color } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: 'name and slug are required' });
      }
      const env = await Environment.create({ name, slug, description, color });
      res.status(201).json(env);
    } catch (err: any) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const env = await Environment.findByPk(req.params.id);
      if (!env) {
        return res.status(404).json({ error: 'Not found' });
      }
      const { name, slug, description, color } = req.body;
      await env.update({ name, slug, description, color });
      res.json(env);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const env = await Environment.findByPk(req.params.id);
      if (!env) {
        return res.status(404).json({ error: 'Not found' });
      }
      await env.destroy();
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }
}
