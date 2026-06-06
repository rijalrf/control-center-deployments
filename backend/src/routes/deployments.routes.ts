import { Router } from 'express';
import { DeploymentsController } from '../controllers/deployments.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', DeploymentsController.list);
router.get('/:id', DeploymentsController.getById);
router.post('/', DeploymentsController.create);
router.post('/:id/execute', DeploymentsController.executeDraft);
router.patch('/:id/status', DeploymentsController.updateStatus);
router.patch('/:id/steps/:stepNumber', DeploymentsController.updateStep);

export default router;
