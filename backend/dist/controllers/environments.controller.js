"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentsController = void 0;
const Environment_1 = require("../models/Environment");
const Server_1 = require("../models/Server");
// Sorts environments: dev → qa/staging → prod → others
function getEnvSortPriority(slug) {
    const s = slug.toLowerCase();
    if (s.includes('dev'))
        return 1;
    if (s.includes('qa') || s.includes('staging') || s.includes('test'))
        return 2;
    if (s.includes('prod') || s.includes('production'))
        return 3;
    return 99;
}
class EnvironmentsController {
    static async list(req, res, next) {
        try {
            const envs = await Environment_1.Environment.findAll({
                include: [{ model: Server_1.Server, as: 'servers' }],
            });
            envs.sort((a, b) => getEnvSortPriority(a.slug) - getEnvSortPriority(b.slug));
            res.json(envs);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const { name, slug, description, color, target_branch } = req.body;
            if (!name || !slug) {
                res.status(400).json({ error: 'name and slug are required' });
                return;
            }
            const env = await Environment_1.Environment.create({
                name,
                slug,
                description: description ?? null,
                color: color ?? '#06b6d4',
                target_branch: target_branch ?? 'main',
            });
            res.status(201).json(env);
        }
        catch (err) {
            if (err instanceof Error && err.name === 'SequelizeUniqueConstraintError') {
                res.status(409).json({ error: 'Slug already exists' });
                return;
            }
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const env = await Environment_1.Environment.findByPk(req.params.id);
            if (!env) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            const { name, slug, description, color, target_branch } = req.body;
            await env.update({ name, slug, description, color, target_branch });
            res.json(env);
        }
        catch (err) {
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            const env = await Environment_1.Environment.findByPk(req.params.id);
            if (!env) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            await env.destroy();
            res.json({ message: 'Deleted' });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.EnvironmentsController = EnvironmentsController;
