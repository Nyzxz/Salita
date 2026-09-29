import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, AuthSession } from '../../../shared/src/types.js';
import { login, parseLoginRequest } from '../../../server/src/auth/auth.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, data: null, error: 'Use POST to sign in.' });
    return;
  }

  const request = parseLoginRequest(req.body);
  if (!request) {
    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Enter your username and password, and choose a role.',
    };
    res.status(400).json(body);
    return;
  }

  const session = await login(request);
  if (!session) {
    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: 'Incorrect username, password, or role.',
    };
    res.status(401).json(body);
    return;
  }

  const body: ApiResponse<AuthSession> = { success: true, data: session };
  res.status(200).json(body);
}
