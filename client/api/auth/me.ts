import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, User } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../server/src/auth/auth.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const header = req.headers.authorization;
  const user = await getUserFromAuthHeader(typeof header === 'string' ? header : undefined);

  if (!user) {
    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'You need to sign in to do that.',
    };
    res.status(401).json(body);
    return;
  }

  const body: ApiResponse<User> = { success: true, data: user };
  res.status(200).json(body);
}
