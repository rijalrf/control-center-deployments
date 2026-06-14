import { Request, Response, NextFunction } from 'express';
import { Deployment } from '../models/Deployment';
import { DeploymentStep } from '../models/DeploymentStep';
import { Environment } from '../models/Environment';
import { User } from '../models/User';
import { Server } from '../models/Server';
import { DeploymentService } from '../services/deployment.service';
import { DeploymentRepository, DeploymentConfig, DeploymentStatus, StepStatus, StepDetail } from '../types';

// Reusable include for fetching a deployment with its relations
const DEPLOYMENT_INCLUDES = [
  { 
    model: Environment, 
    as: 'environment',
    include: [{ model: Server, as: 'servers' }]
  },
  { model: DeploymentStep, as: 'steps' },
];

interface CreateDeploymentBody {
  environment_id: number;
  repositories: DeploymentRepository[];
  config?: DeploymentConfig;
  notes?: string;
  status?: DeploymentStatus;
}

interface UpdateStatusBody {
  status: DeploymentStatus;
}

interface UpdateStepBody {
  status: StepStatus;
  log?: string;
  detail?: StepDetail;
}

export class DeploymentsController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deployments = await Deployment.findAll({
        include: [
          { 
            model: Environment, 
            as: 'environment', 
            attributes: ['id', 'name', 'slug', 'color'],
            include: [{ model: Server, as: 'servers' }]
          },
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

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deployment = await Deployment.findByPk(req.params.id, {
        include: [
          { 
            model: Environment, 
            as: 'environment',
            include: [{ model: Server, as: 'servers' }]
          },
          { model: User, as: 'user', attributes: ['id', 'login', 'name', 'avatar_url'] },
          { model: DeploymentStep, as: 'steps' },
        ],
      });
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }
      res.json(deployment);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { environment_id, repositories, config, notes, status } =
        req.body as CreateDeploymentBody;

      if (!environment_id || !repositories?.length) {
        res.status(400).json({ error: 'environment_id and repositories are required' });
        return;
      }

      const userId    = req.user!.id;

      const deployment = await DeploymentService.createDeployment({
        environment_id,
        user_id: userId,
        repositories,
        config: config ?? {},
        notes,
        status,
      });

      const result = await Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body as UpdateStatusBody;
      const deployment = await Deployment.findByPk(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await deployment.update({ status });
      res.json(deployment);
    } catch (err) {
      next(err);
    }
  }

  static async updateStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, log, detail } = req.body as UpdateStepBody;
      const step = await DeploymentStep.findOne({
        where: { deployment_id: req.params.id, step_number: req.params.stepNumber },
      });
      if (!step) {
        res.status(404).json({ error: 'Step not found' });
        return;
      }

      const updates: Partial<{
        status: StepStatus;
        log: string;
        detail: StepDetail;
        started_at: Date;
        completed_at: Date;
      }> = { status };

      if (log !== undefined)    updates.log    = log;
      if (detail !== undefined) updates.detail = detail;
      if (status === 'running'                    && !step.started_at)   updates.started_at   = new Date();
      if ((status === 'completed' || status === 'failed') && !step.completed_at) updates.completed_at = new Date();

      await step.update(updates);
      res.json(step);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { environment_id, repositories, config, notes, status } = req.body;
      const deployment = await Deployment.findByPk(req.params.id);
      if (!deployment) {
        res.status(404).json({ error: 'Deployment not found' });
        return;
      }

      if (deployment.status !== 'draft' && deployment.status !== 'failed' && deployment.status !== 'cancelled') {
        res.status(400).json({ error: 'Only draft, failed, or cancelled deployments can be updated' });
        return;
      }

      const updates: any = {};
      if (environment_id !== undefined) updates.environment_id = environment_id;
      if (repositories !== undefined)   updates.repositories = repositories;
      if (config !== undefined)         updates.config = config;
      if (notes !== undefined)          updates.notes = notes;
      if (status !== undefined)         updates.status = status;

      await deployment.update(updates);

      const result = await Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async executeDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deploymentId = parseInt(req.params.id, 10);

      const deployment = await DeploymentService.executeDraftDeployment(deploymentId);
      const result     = await Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async retry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deploymentId = parseInt(req.params.id, 10);

      const deployment = await DeploymentService.retryDeployment(deploymentId);
      const result     = await Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
