"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const EnvVar_1 = require("../models/EnvVar");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
// GET /api/env-vars — list all
router.get('/', async (_req, res) => {
    try {
        const items = await EnvVar_1.EnvVar.findAll({ order: [['created_at', 'DESC']] });
        res.json(items);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/env-vars/:id — get one
router.get('/:id', async (req, res) => {
    try {
        const item = await EnvVar_1.EnvVar.findByPk(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        res.json(item);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// POST /api/env-vars — create
router.post('/', async (req, res) => {
    try {
        const { name, repository_name, environment_id, vars } = req.body;
        if (!name)
            return res.status(400).json({ error: 'name is required' });
        const item = await EnvVar_1.EnvVar.create({
            name,
            repository_name: repository_name || '',
            environment_id: environment_id || null,
            vars: vars || {},
        });
        res.status(201).json(item);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// PUT /api/env-vars/:id — update
router.put('/:id', async (req, res) => {
    try {
        const item = await EnvVar_1.EnvVar.findByPk(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        const { name, repository_name, environment_id, vars } = req.body;
        await item.update({
            name: name ?? item.name,
            repository_name: repository_name ?? item.repository_name,
            environment_id: environment_id !== undefined ? environment_id : item.environment_id,
            vars: vars ?? item.vars,
        });
        res.json(item);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// DELETE /api/env-vars/:id — delete
router.delete('/:id', async (req, res) => {
    try {
        const item = await EnvVar_1.EnvVar.findByPk(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        await item.destroy();
        res.json({ message: 'Deleted' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// GET /api/env-vars/:id/export — export as .env text
router.get('/:id/export', async (req, res) => {
    try {
        const item = await EnvVar_1.EnvVar.findByPk(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Not found' });
        const content = Object.entries(item.vars)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=".env"`);
        res.send(content);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
