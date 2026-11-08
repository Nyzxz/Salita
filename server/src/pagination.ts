export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface PageRequest {
  page: number;
  limit: number;
  skip: number;
}

function first(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

/** Reads `?page=` (1-based) and `?limit=` from a query, clamping both to safe values. */
export function parsePageRequest(query: Record<string, unknown>, defaultLimit = DEFAULT_PAGE_SIZE): PageRequest {
  const rawPage = Number.parseInt(first(query.page) ?? '', 10);
  const rawLimit = Number.parseInt(first(query.limit) ?? '', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 100_000) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, MAX_PAGE_SIZE) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

/** Reads one string query value, trimmed and capped. */
export function queryString(query: Record<string, unknown>, key: string, max = 100): string | undefined {
  const value = first(query[key])?.trim();
  return value ? value.slice(0, max) : undefined;
}

/** Escapes text so it can be used inside a RegExp (for case-insensitive search). */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
