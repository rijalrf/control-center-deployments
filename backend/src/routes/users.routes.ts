import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', UsersController.list);
router.post('/', UsersController.create);
router.put('/:id', UsersController.update);
router.delete('/:id', UsersController.delete);

export default router;
