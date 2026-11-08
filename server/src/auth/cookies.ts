import { TOKEN_TTL_SECONDS } from './token.js';

/** Name of the httpOnly cookie that carries the session token. */
export const SESSION_COOKIE = 'salita_session';

/**
 * What the browser sees in place of the real token. The real one lives only in
 * the httpOnly cookie, so page scripts (and any XSS) can never read it.
 */
export const COOKIE_SESSION_MARKER = 'cookie-session';

type HeaderBag = Record<string, string | string[] | undefined>;

export function readCookie(headers: HeaderBag, name: string): string | undefined {
  const raw = headers.cookie;
  const header = Array.isArray(raw) ? raw.join('; ') : raw;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function secureFlag(): string {
  // Browsers refuse Secure cookies on plain http, so only local development omits it.
  return process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : '';
}

/** Set-Cookie value that stores the token: httpOnly, same-site only, scoped to the API. */
export function buildSessionCookie(token: string, maxAgeSeconds: number = TOKEN_TTL_SECONDS): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}${secureFlag()}`;
}

/** Set-Cookie value that removes the session cookie. */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag()}`;
}

/** Custom header every browser request must send; cross-site forms and images cannot add it. */
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'salita';
