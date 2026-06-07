import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token =
      req.cookies?.ccd_token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: number; login: string };
    const user    = await User.findByPk(decoded.id);

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    req.user = user.toJSON();
    next();
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
    ) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }
    next(err);
  }
};
