import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

import { env } from '../config/env';

const router = Router();

router.get('/github', passport.authenticate('github', {
  scope: ['user:email', 'read:org', 'repo', 'workflow'],
  session: false,
}));

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed` }),
  AuthController.githubCallback
);

router.get('/me', authMiddleware, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
