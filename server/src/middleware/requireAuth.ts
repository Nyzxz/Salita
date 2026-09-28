import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../auth/auth.service.js';
import { ApiError } from './errorHandler.js';

export function requireAuth(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getUserFromAuthHeader(req.header('authorization'));
    if (!user) {
      next(new ApiError(401, 'You need to sign in to do that.'));
      return;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      next(new ApiError(403, 'Your account is not allowed to do that.'));
      return;
    }
    res.locals.user = user;
    next();
  };
}
