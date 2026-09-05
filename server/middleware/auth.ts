import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { Role } from '../types';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production. Refusing to start.');
  }
  console.warn('[Auth] JWT_SECRET not set. Generating an ephemeral dev secret - all sessions will be invalidated on restart. Set JWT_SECRET in .env.');
}

// Ephemeral dev-only secret (never persisted, regenerated each boot)
const resolvedSecret: string = JWT_SECRET || crypto.randomBytes(48).toString('hex');

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export function generateToken(user: { id: string; email: string; name: string; role: Role }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    resolvedSecret,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, resolvedSecret) as any;
    req.user = decoded;
    next();
  } catch (err) {
    // Invalid or expired token
    next();
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}
