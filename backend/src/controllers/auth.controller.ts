import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserAttributes } from '../types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static githubCallback(req: Request, res: Response): void {
    if (!req.user) {
      res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
      return;
    }

    const token = jwt.sign(
      { id: req.user.id, login: req.user.login },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN },
    );

    res.cookie('ccd_token', token, COOKIE_OPTIONS);
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  }

  static getMe(req: Request, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id, github_id, login, name, email, avatar_url, created_at } =
      req.user as UserAttributes;

    res.json({ id, github_id, login, name, email, avatar_url, created_at });
  }

  static logout(_req: Request, res: Response): void {
    res.clearCookie('ccd_token', COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully' });
  }
}
