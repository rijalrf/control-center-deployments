import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserAttributes } from '../types';
import { User } from '../models/User';
import crypto from 'crypto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const user = await User.findOne({ where: { login: username } });
      if (!user) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      if (user.password !== hashedPassword) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, login: user.login },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN },
      );

      res.cookie('ccd_token', token, COOKIE_OPTIONS);
      res.json({
        message: 'Logged in successfully',
        user: {
          id: user.id,
          github_id: user.github_id,
          login: user.login,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          created_at: user.created_at
        }
      });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
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
