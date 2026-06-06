import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  if (err.oauthError) {
    console.error(`[OAUTH ERROR DETAILS]`, err.oauthError);
    if (err.oauthError.data) {
      console.error(`[OAUTH ERROR DATA]`, err.oauthError.data);
    }
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
