import { Router } from 'express';
import { ReposController } from '../controllers/repos.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', ReposController.list);
router.post('/sync', ReposController.sync);
router.delete('/:id', ReposController.delete);
router.get('/:id/env-keys', ReposController.getEnvKeys);

export default router;
