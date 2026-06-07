import { Router } from 'express';
import { ServersController } from '../controllers/servers.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', ServersController.list);
router.post('/', ServersController.create);
router.put('/:id', ServersController.update);
router.delete('/:id', ServersController.delete);
router.post('/:id/ping', ServersController.ping);

export default router;
