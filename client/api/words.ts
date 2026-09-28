import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, Category, WordItem } from '../../shared/src/types.js';
import { WORDS } from '../../server/src/data/words.data.js';

// Mirrors shared/src/types.ts VALID_CATEGORIES — see server/src/routes/words.routes.ts
// for why this is a local literal rather than a shared runtime import.
const KNOWN_CATEGORIES: readonly Category[] = ['greetings', 'food', 'values', 'phrases'];

export default function handler(req: VercelRequest, res: VercelResponse): void {
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
