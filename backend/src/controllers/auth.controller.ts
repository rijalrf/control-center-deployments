import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserAttributes } from '../types';
import { User } from '../models/User';
import crypto from 'crypto';
import axios from 'axios';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async githubLogin(_req: Request, res: Response): Promise<void> {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.github.clientId}&redirect_uri=${env.github.callbackUrl}&scope=repo,user:email`;
    res.redirect(githubAuthUrl);
  }

  static async githubCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;
      if (!code) {
        res.status(400).send('No code provided');
        return;
      }

      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: env.github.clientId,
          client_secret: env.github.clientSecret,
          code,
        },
        { headers: { Accept: 'application/json' } }
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        res.status(401).send('Failed to get access token from GitHub');
        return;
      }

      // 2. Get user info from GitHub
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const ghUser = userResponse.data;

      // 3. Find or Create user in database
      let user = await User.findOne({ where: { github_id: String(ghUser.id) } });

      if (user) {
        await user.update({
          login: ghUser.login,
          name: ghUser.name || ghUser.login,
          email: ghUser.email,
          avatar_url: ghUser.avatar_url,
          access_token: accessToken, // Update token on every login
        });
      } else {
        user = await User.create({
          github_id: String(ghUser.id),
          login: ghUser.login,
          name: ghUser.name || ghUser.login,
          email: ghUser.email,
          avatar_url: ghUser.avatar_url,
          access_token: accessToken,
        });
      }

      // 4. Generate JWT
      const token = jwt.sign(
        { id: user.id, login: user.login },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN },
      );

      // 5. Set cookie and redirect to frontend
      res.cookie('ccd_token', token, COOKIE_OPTIONS);
      res.redirect(env.FRONTEND_URL);
    } catch (err: unknown) {
      console.error('GitHub OAuth Error:', err);
      res.status(500).send('Authentication failed');
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
