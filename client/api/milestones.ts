import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, LanguageMilestone } from '../../shared/src/types.js';
import { MILESTONES } from '../../server/src/data/milestones.data.js';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const body: ApiResponse<LanguageMilestone[]> = { success: true, data: MILESTONES };
  res.status(200).json(body);
}
