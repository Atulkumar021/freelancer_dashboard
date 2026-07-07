import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/user';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: JwtPayload;
    }
  }
}

export function requireJwt(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'fallback') as JwtPayload;
    req.jwtUser = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.jwtUser || !roles.includes(req.jwtUser.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireCompanyAccess(req: Request, res: Response, next: NextFunction): void {
  const jwtUser = req.jwtUser;
  if (!jwtUser) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
  if (jwtUser.role === 'superadmin') { next(); return; }
  const companyIdFromPath = req.path.split('/').filter(Boolean)[0]?.split('?')[0];
  if (!companyIdFromPath) { next(); return; }
  if (jwtUser.companyId && jwtUser.companyId === companyIdFromPath) { next(); return; }
  res.status(403).json({ success: false, error: 'Access denied to this company\'s data' });
}
