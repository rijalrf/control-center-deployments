import { Request, Response, NextFunction } from 'express';
import { Server } from '../models/Server';
import { Environment } from '../models/Environment';

export class ServersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const servers = await Server.findAll({
        include: [{ model: Environment, as: 'environment', attributes: ['id', 'name', 'slug', 'color'] }],
        order: [['name', 'ASC']],
      });
      res.json(servers);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, host, port, username, environment_id } = req.body;
      if (!name || !host) {
        return res.status(400).json({ error: 'name and host are required' });
      }
      const server = await Server.create({ name, host, port: port || 22, username, environment_id });
      const result = await Server.findByPk(server.id, {
        include: [{ model: Environment, as: 'environment' }],
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const server = await Server.findByPk(req.params.id);
      if (!server) {
        return res.status(404).json({ error: 'Not found' });
      }
      const { name, host, port, username, environment_id, status } = req.body;
      await server.update({ name, host, port, username, environment_id, status });
      res.json(server);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const server = await Server.findByPk(req.params.id);
      if (!server) {
        return res.status(404).json({ error: 'Not found' });
      }
      await server.destroy();
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }
}
