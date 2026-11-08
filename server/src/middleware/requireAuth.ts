import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../../../shared/src/types.js';
import { getUserFromRequest } from '../auth/auth.service.js';
import { ApiError } from './errorHandler.js';

function buildGuard(allowPasswordChange: boolean, allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void getUserFromRequest(req, { allowPasswordChange })
      .then((user) => {
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
      })
      .catch(next);
  };
}

/**
 * Requires a signed-in user. Accounts that still have to replace their default
 * password are refused here, so the forced change can't be skipped by calling
 * the API directly.
 */
export function requireAuth(...allowedRoles: UserRole[]) {
  return buildGuard(false, allowedRoles);
}

/** Same as requireAuth, but lets a user who must change their password through. */
export function requireAuthAllowingPasswordChange(...allowedRoles: UserRole[]) {
  return buildGuard(true, allowedRoles);
}
