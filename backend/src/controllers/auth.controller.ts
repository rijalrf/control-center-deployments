import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static githubCallback(req: Request, res: Response) {
    if (!req.user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
    }

    const token = jwt.sign(
      { id: req.user.id, login: req.user.login },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.cookie('ccd_token', token, COOKIE_OPTIONS);
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  }

  static getMe(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id, github_id, login, name, email, avatar_url, created_at } = req.user as any;
    res.json({ id, github_id, login, name, email, avatar_url, created_at });
  }

  static logout(req: Request, res: Response) {
    res.clearCookie('ccd_token', COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully' });
  }
}
