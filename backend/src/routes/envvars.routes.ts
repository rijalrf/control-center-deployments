import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { EnvVar } from '../models/EnvVar';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(authMiddleware);

const PROJECT_ENV_PATH = '/app/.env';

// GET /api/env-vars/project-env/raw
router.get('/project-env/raw', async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(PROJECT_ENV_PATH)) {
      return res.status(404).json({ error: 'Project .env file not found inside container' });
    }
    const content = fs.readFileSync(PROJECT_ENV_PATH, 'utf-8');
    res.json({ content });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/env-vars/project-env/raw
router.post('/project-env/raw', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'content is required' });
    }
    fs.writeFileSync(PROJECT_ENV_PATH, content, 'utf-8');
    res.json({ message: 'Project .env updated successfully!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/env-vars — list all
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await EnvVar.findAll({ order: [['created_at', 'DESC']] });
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/env-vars/:id — get one
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await EnvVar.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/env-vars — create
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, repository_name, environment_id, vars } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const item = await EnvVar.create({
      name,
      repository_name: repository_name || '',
      environment_id: environment_id || null,
      vars: vars || {},
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/env-vars/:id — update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const item = await EnvVar.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { name, repository_name, environment_id, vars } = req.body;
    await item.update({
      name: name ?? item.name,
      repository_name: repository_name ?? item.repository_name,
      environment_id: environment_id !== undefined ? environment_id : item.environment_id,
      vars: vars ?? item.vars,
    });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/env-vars/:id — delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const item = await EnvVar.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/env-vars/:id/export — export as .env text
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const item = await EnvVar.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const content = Object.entries(item.vars)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=".env"`);
    res.send(content);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
