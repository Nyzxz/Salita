import { Router } from 'express';
import type { ApiResponse, Category, WordItem } from '../../../shared/src/types.js';
import { WORDS } from '../data/words.data.js';
import { ApiError } from '../middleware/errorHandler.js';

// Mirrors shared/src/types.ts VALID_CATEGORIES. Kept as a plain literal here
// (rather than importing the shared runtime array) so the server never
// depends on cross-package runtime resolution — see README "Project
// Architecture" for why. The `Category` *type* import above still keeps
// this array checked against the shared union at compile time.
const KNOWN_CATEGORIES: readonly Category[] = ['greetings', 'food', 'values', 'phrases'];

function isCategory(value: string): value is Category {
  return (KNOWN_CATEGORIES as readonly string[]).includes(value);
}

export const wordsRouter = Router();

/**
 * GET /api/words
 * GET /api/words?category=food
 */
wordsRouter.get('/', (req, res, next) => {
  try {
    const { category } = req.query;

    let result: WordItem[] = WORDS;

    if (typeof category === 'string' && category.length > 0) {
      if (!isCategory(category)) {
        throw new ApiError(
          400,
          `Unknown category "${category}". Expected one of: ${KNOWN_CATEGORIES.join(', ')}.`,
        );
      }
      result = WORDS.filter((word) => word.category === category);
    }

    const body: ApiResponse<WordItem[]> = { success: true, data: result };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** GET /api/words/:id */
wordsRouter.get('/:id', (req, res, next) => {
  try {
    const word = WORDS.find((item) => item.id === req.params.id);
    if (!word) {
      throw new ApiError(404, `No word found with id "${req.params.id}".`);
    }
    const body: ApiResponse<WordItem> = { success: true, data: word };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
