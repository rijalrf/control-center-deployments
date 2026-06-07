import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const envPath = path.join(__dirname, '../../../.env');

router.use(authMiddleware);

// GET /api/config/env - Get system .env content
router.get('/env', (req, res, next) => {
  try {
    if (!fs.existsSync(envPath)) {
      return res.json({ content: '' });
    }
    const content = fs.readFileSync(envPath, 'utf8');
    res.json({ content });
  } catch (err) {
    next(err);
  }
});

// POST /api/config/env - Update system .env content
router.post('/env', (req, res, next) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }
    fs.writeFileSync(envPath, content, 'utf8');
    res.json({ success: true, message: '.env file updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
