import { Request, Response, NextFunction } from 'express';
import { Server } from '../models/Server';
import { Environment } from '../models/Environment';
import net from 'net';

interface ServerBody {
  name: string;
  host: string;
  port?: number;
  username?: string;
  environment_id?: number | null;
  status?: 'active' | 'inactive' | 'unknown';
}

export class ServersController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
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

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, host, port, username, environment_id } = req.body as ServerBody;

      if (!name || !host) {
        res.status(400).json({ error: 'name and host are required' });
        return;
      }

      const server = await Server.create({ name, host, port: port ?? 22, username, environment_id });
      const result = await Server.findByPk(server.id, {
        include: [{ model: Environment, as: 'environment' }],
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const server = await Server.findByPk(req.params.id);
      if (!server) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const { name, host, port, username, environment_id, status } = req.body as ServerBody;
      await server.update({ name, host, port, username, environment_id, status });
      res.json(server);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const server = await Server.findByPk(req.params.id);
      if (!server) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await server.destroy();
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  static async ping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const server = await Server.findByPk(req.params.id);
      if (!server) {
        res.status(404).json({ error: 'Server not found' });
        return;
      }

      const isReachable = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        let finished = false;

        socket.setTimeout(3000);

        socket.on('connect', () => {
          finished = true;
          socket.destroy();
          resolve(true);
        });

        const handleFail = () => {
          if (!finished) {
            finished = true;
            socket.destroy();
            resolve(false);
          }
        };

        socket.on('timeout', handleFail);
        socket.on('error', handleFail);

        socket.connect(server.port || 22, server.host);
      });

      const newStatus = isReachable ? 'active' : 'inactive';
      await server.update({ status: newStatus });

      res.json({
        message: `Connection ${isReachable ? 'succeeded' : 'failed'}`,
        status: newStatus,
        server,
      });
    } catch (err) {
      next(err);
    }
  }
}
