import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '../../../shared/src/types.js';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

export const TOKEN_TTL_SECONDS = 60 * 60 * 8;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured in production.');
  }
  return 'dev-only-secret-change-me';
}

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

function sign(unsigned: string): string {
  return createHmac('sha256', getSecret()).update(unsigned).digest('base64url');
}

export function createToken(payload: TokenPayload): string {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = encode(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${body}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(decode(body)) as Partial<TokenPayload>;
    if (
      typeof payload.sub !== 'string' ||
      (payload.role !== 'STUDENT' && payload.role !== 'TEACHER') ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null;
    return { sub: payload.sub, role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
}
