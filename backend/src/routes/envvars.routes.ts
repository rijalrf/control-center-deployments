import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { EnvVar } from '../models/EnvVar';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(authMiddleware);

const PROJECT_ENV_PATH = '/app/.env';

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      result[key] = val;
    }
  }
  return result;
}

function generateEnvFile(vars: Record<string, string>): string {
  const sections = [
    {
      title: 'APP',
      keys: ['NODE_ENV', 'BACKEND_PORT', 'FRONTEND_URL']
    },
    {
      title: 'JWT (JSON Web Token)',
      keys: ['JWT_SECRET', 'JWT_EXPIRES_IN']
    },
    {
      title: 'DATABASE (MySQL)',
      keys: ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_ROOT_PASSWORD']
    },
    {
      title: 'GITHUB OAUTH APP',
      keys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL']
    },
    {
      title: 'GITHUB PERSONAL ACCESS TOKEN (PAT)',
      keys: ['GITHUB_TOKEN', 'GITHUB_ORG']
    },
    {
      title: 'CENTRAL DEPLOYER (GitHub Actions Workflow Dispatch)',
      keys: ['GITHUB_CENTRAL_OWNER', 'GITHUB_CENTRAL_REPO', 'GITHUB_CENTRAL_WORKFLOW']
    },
    {
      title: 'FRONTEND (Vite)',
      keys: ['VITE_API_URL']
    }
  ];

  let content = `# ============================================================\n`;
  content += `# Control Center Deployments — Environment Configuration\n`;
  content += `# Generated automatically by CCD Panel\n`;
  content += `# ============================================================\n\n`;

  const writtenKeys = new Set<string>();

  for (const section of sections) {
    content += `# ============================================================\n`;
    content += `# ${section.title}\n`;
    content += `# ============================================================\n`;
    for (const key of section.keys) {
      const value = vars[key] !== undefined ? vars[key] : '';
      content += `${key}=${value}\n`;
      writtenKeys.add(key);
    }
    content += `\n`;
  }

  let hasOther = false;
  for (const [key, value] of Object.entries(vars)) {
    if (!writtenKeys.has(key)) {
      if (!hasOther) {
        content += `# ============================================================\n`;
        content += `# OTHER / CUSTOM VARIABLES\n`;
        content += `# ============================================================\n`;
        hasOther = true;
      }
      content += `${key}=${value}\n`;
    }
  }

  return content.trim() + '\n';
}

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

// GET /api/env-vars/project-env/json
router.get('/project-env/json', async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(PROJECT_ENV_PATH)) {
      return res.status(404).json({ error: 'Project .env file not found' });
    }
    const content = fs.readFileSync(PROJECT_ENV_PATH, 'utf-8');
    const parsed = parseEnvFile(content);
    res.json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/env-vars/project-env/json
router.post('/project-env/json', async (req: Request, res: Response) => {
  try {
    const vars = req.body;
    if (!vars || typeof vars !== 'object') {
      return res.status(400).json({ error: 'Variables object is required' });
    }
    const content = generateEnvFile(vars);
    fs.writeFileSync(PROJECT_ENV_PATH, content, 'utf-8');
    res.json({ message: 'Project .env file updated successfully!' });
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
