import { Router } from 'express';
import authRoutes from './auth.routes';
import reposRoutes from './repos.routes';
import deploymentsRoutes from './deployments.routes';
import environmentsRoutes from './environments.routes';
import serversRoutes from './servers.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/repos', reposRoutes);
router.use('/deployments', deploymentsRoutes);
router.use('/environments', environmentsRoutes);
router.use('/servers', serversRoutes);

export default router;
