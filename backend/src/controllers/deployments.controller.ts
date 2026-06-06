import { Request, Response, NextFunction } from 'express';
import { Deployment } from '../models/Deployment';
import { DeploymentStep } from '../models/DeploymentStep';
import { Environment } from '../models/Environment';
import { User } from '../models/User';
import { DeploymentService } from '../services/deployment.service';

export class DeploymentsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const deployments = await Deployment.findAll({
        include: [
          { model: Environment, as: 'environment', attributes: ['id', 'name', 'slug', 'color'] },
          { model: User, as: 'user', attributes: ['id', 'login', 'name', 'avatar_url'] },
          { model: DeploymentStep, as: 'steps' },
        ],
        order: [['created_at', 'DESC']],
      });
      res.json(deployments);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const deployment = await Deployment.findByPk(req.params.id, {
        include: [
          { model: Environment, as: 'environment' },
          { model: User, as: 'user', attributes: ['id', 'login', 'name', 'avatar_url'] },
          { model: DeploymentStep, as: 'steps' },
        ],
      });
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      res.json(deployment);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { environment_id, repositories, config, notes } = req.body;

      if (!environment_id || !repositories?.length) {
        return res.status(400).json({ error: 'environment_id and repositories are required' });
      }

      const userId = (req.user as any).id;
      const deployment = await DeploymentService.createDeployment({
        environment_id,
        user_id: userId,
        repositories,
        config: config || {},
        notes,
      });

      const result = await Deployment.findByPk(deployment.id, {
        include: [
          { model: Environment, as: 'environment' },
          { model: DeploymentStep, as: 'steps' },
        ],
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const deployment = await Deployment.findByPk(req.params.id);
      if (!deployment) {
        return res.status(404).json({ error: 'Not found' });
      }
      await deployment.update({ status });
      res.json(deployment);
    } catch (err) {
      next(err);
    }
  }

  static async updateStep(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, log, detail } = req.body;
      const step = await DeploymentStep.findOne({
        where: { deployment_id: req.params.id, step_number: req.params.stepNumber },
      });
      if (!step) {
        return res.status(404).json({ error: 'Step not found' });
      }

      const updates: any = { status };
      if (log !== undefined) updates.log = log;
      if (detail !== undefined) updates.detail = detail;
      if (status === 'running' && !step.started_at) updates.started_at = new Date();
      if ((status === 'completed' || status === 'failed') && !step.completed_at) updates.completed_at = new Date();

      await step.update(updates);
      res.json(step);
    } catch (err) {
      next(err);
    }
  }
}
