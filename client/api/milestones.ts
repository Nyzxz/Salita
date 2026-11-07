import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, LanguageMilestone } from '../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../server/src/auth/auth.service.js';
import { MILESTONES } from '../../server/src/data/milestones.data.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }

  const body: ApiResponse<LanguageMilestone[]> = { success: true, data: MILESTONES };
  res.status(200).json(body);
}
