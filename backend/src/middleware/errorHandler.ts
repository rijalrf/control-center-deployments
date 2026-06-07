import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

interface AppError extends Error {
  status?: number;
  statusCode?: number;
  oauthError?: {
    data?: unknown;
  };
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err.oauthError) {
    console.error('[OAUTH ERROR DETAILS]', err.oauthError);
    if (err.oauthError.data) {
      console.error('[OAUTH ERROR DATA]', err.oauthError.data);
    }
  }

  const status  = err.status ?? err.statusCode ?? 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
