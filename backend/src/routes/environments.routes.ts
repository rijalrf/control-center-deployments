import { Router } from 'express';
import { EnvironmentsController } from '../controllers/environments.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', EnvironmentsController.list);
router.post('/', EnvironmentsController.create);
router.put('/:id', EnvironmentsController.update);
router.delete('/:id', EnvironmentsController.delete);

export default router;
