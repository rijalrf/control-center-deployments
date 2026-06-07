"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentsController = void 0;
const Environment_1 = require("../models/Environment");
const Server_1 = require("../models/Server");
class EnvironmentsController {
    static async list(req, res, next) {
        try {
            const envs = await Environment_1.Environment.findAll({
                include: [{ model: Server_1.Server, as: 'servers' }],
            });
            const getEnvPriority = (slug) => {
                const s = slug.toLowerCase();
                if (s.includes('dev'))
                    return 1;
                if (s.includes('qa') || s.includes('staging') || s.includes('test'))
                    return 2;
                if (s.includes('prod') || s.includes('production'))
                    return 3;
                return 99;
            };
            envs.sort((a, b) => getEnvPriority(a.slug) - getEnvPriority(b.slug));
            res.json(envs);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const { name, slug, description, color } = req.body;
            if (!name || !slug) {
                return res.status(400).json({ error: 'name and slug are required' });
            }
            const env = await Environment_1.Environment.create({ name, slug, description, color });
            res.status(201).json(env);
        }
        catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Slug already exists' });
            }
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const env = await Environment_1.Environment.findByPk(req.params.id);
            if (!env) {
                return res.status(404).json({ error: 'Not found' });
            }
            const { name, slug, description, color } = req.body;
            await env.update({ name, slug, description, color });
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
                return res.status(404).json({ error: 'Not found' });
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
