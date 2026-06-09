"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentsController = void 0;
const Deployment_1 = require("../models/Deployment");
const DeploymentStep_1 = require("../models/DeploymentStep");
const Environment_1 = require("../models/Environment");
const User_1 = require("../models/User");
const deployment_service_1 = require("../services/deployment.service");
// Reusable include for fetching a deployment with its relations
const DEPLOYMENT_INCLUDES = [
    { model: Environment_1.Environment, as: 'environment' },
    { model: DeploymentStep_1.DeploymentStep, as: 'steps' },
];
class DeploymentsController {
    static async list(_req, res, next) {
        try {
            const deployments = await Deployment_1.Deployment.findAll({
                include: [
                    { model: Environment_1.Environment, as: 'environment', attributes: ['id', 'name', 'slug', 'color'] },
                    { model: User_1.User, as: 'user', attributes: ['id', 'login', 'name', 'avatar_url'] },
                    { model: DeploymentStep_1.DeploymentStep, as: 'steps' },
                ],
                order: [['created_at', 'DESC']],
            });
            res.json(deployments);
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const deployment = await Deployment_1.Deployment.findByPk(req.params.id, {
                include: [
                    { model: Environment_1.Environment, as: 'environment' },
                    { model: User_1.User, as: 'user', attributes: ['id', 'login', 'name', 'avatar_url'] },
                    { model: DeploymentStep_1.DeploymentStep, as: 'steps' },
                ],
            });
            if (!deployment) {
                res.status(404).json({ error: 'Deployment not found' });
                return;
            }
            res.json(deployment);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const { environment_id, repositories, config, notes, status } = req.body;
            if (!environment_id || !repositories?.length) {
                res.status(400).json({ error: 'environment_id and repositories are required' });
                return;
            }
            const userId = req.user.id;
            const userToken = req.user.access_token ?? '';
            const deployment = await deployment_service_1.DeploymentService.createDeployment({
                environment_id,
                user_id: userId,
                repositories,
                config: config ?? {},
                notes,
                accessToken: userToken,
                status,
            });
            const result = await Deployment_1.Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            const deployment = await Deployment_1.Deployment.findByPk(req.params.id);
            if (!deployment) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            await deployment.update({ status });
            res.json(deployment);
        }
        catch (err) {
            next(err);
        }
    }
    static async updateStep(req, res, next) {
        try {
            const { status, log, detail } = req.body;
            const step = await DeploymentStep_1.DeploymentStep.findOne({
                where: { deployment_id: req.params.id, step_number: req.params.stepNumber },
            });
            if (!step) {
                res.status(404).json({ error: 'Step not found' });
                return;
            }
            const updates = { status };
            if (log !== undefined)
                updates.log = log;
            if (detail !== undefined)
                updates.detail = detail;
            if (status === 'running' && !step.started_at)
                updates.started_at = new Date();
            if ((status === 'completed' || status === 'failed') && !step.completed_at)
                updates.completed_at = new Date();
            await step.update(updates);
            res.json(step);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const { environment_id, repositories, config, notes, status } = req.body;
            const deployment = await Deployment_1.Deployment.findByPk(req.params.id);
            if (!deployment) {
                res.status(404).json({ error: 'Deployment not found' });
                return;
            }
            if (deployment.status !== 'draft') {
                res.status(400).json({ error: 'Only draft deployments can be updated' });
                return;
            }
            const updates = {};
            if (environment_id !== undefined)
                updates.environment_id = environment_id;
            if (repositories !== undefined)
                updates.repositories = repositories;
            if (config !== undefined)
                updates.config = config;
            if (notes !== undefined)
                updates.notes = notes;
            if (status !== undefined)
                updates.status = status;
            await deployment.update(updates);
            const result = await Deployment_1.Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async executeDraft(req, res, next) {
        try {
            const deploymentId = parseInt(req.params.id, 10);
            const userToken = req.user.access_token ?? '';
            const deployment = await deployment_service_1.DeploymentService.executeDraftDeployment(deploymentId, userToken);
            const result = await Deployment_1.Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async retry(req, res, next) {
        try {
            const deploymentId = parseInt(req.params.id, 10);
            const userToken = req.user.access_token ?? '';
            const deployment = await deployment_service_1.DeploymentService.retryDeployment(deploymentId, userToken);
            const result = await Deployment_1.Deployment.findByPk(deployment.id, { include: DEPLOYMENT_INCLUDES });
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DeploymentsController = DeploymentsController;
