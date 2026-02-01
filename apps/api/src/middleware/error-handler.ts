import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(
    {
      error: err,
      path: req.path,
      method: req.method,
      tenantId: req.tenantId,
      userId: req.user?.userId,
    },
    'Unhandled error'
  );

  res.status(500).json({
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
  });
}
