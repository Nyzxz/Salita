import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, Category, WordItem } from '../../shared/src/types.js';
import { getUserFromRequest } from '../../server/src/auth/auth.service.js';
import mongoose from 'mongoose';
import { connectDB } from '../../server/src/config/db.js';
import { WORDS } from '../../server/src/data/words.data.js';

// Mirrors shared/src/types.ts VALID_CATEGORIES — see server/src/routes/words.routes.ts
// for why this is a local literal rather than a shared runtime import.
const KNOWN_CATEGORIES: readonly Category[] = ['greetings', 'food', 'values', 'phrases'];

/**
 * GET /api/health — served from this function (via a rewrite in vercel.json) so the
 * project stays within Vercel's 12-function Hobby limit. Public on purpose, and it
 * reveals nothing but whether the API and (with ?deep=1) the database respond.
 */
async function handleHealth(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
    return;
  }
  let database: 'ok' | 'down' | 'skipped' = 'skipped';
  if (req.query.deep === '1') {
    try {
      await connectDB();
      database = mongoose.connection.readyState === 1 ? 'ok' : 'down';
    } catch {
      database = 'down';
    }
  }
  const healthy = database !== 'down';
  res.status(healthy ? 200 : 503).json({ success: healthy, data: { status: healthy ? 'ok' : 'degraded', database } });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.query.health !== undefined) {
    await handleHealth(req, res);
    return;
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }

  const { category } = req.query;

  if (typeof category === 'string' && category.length > 0) {
    if (!(KNOWN_CATEGORIES as readonly string[]).includes(category)) {
      const body: ApiResponse<null> = {
        success: false,
        data: null,
        error: `Unknown category "${category}". Expected one of: ${KNOWN_CATEGORIES.join(', ')}.`,
      };
      res.status(400).json(body);
      return;
    }
    const data = WORDS.filter((word) => word.category === category);
    const body: ApiResponse<WordItem[]> = { success: true, data };
    res.status(200).json(body);
    return;
  }

  const body: ApiResponse<WordItem[]> = { success: true, data: WORDS };
  res.status(200).json(body);
}
