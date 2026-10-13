import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse } from '../../../shared/src/types.js';
import { login, parseLoginRequest } from '../../../server/src/auth/auth.service.js';
import { loginOutcomeToHttp } from '../../../server/src/auth/loginOutcome.js';

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

  const { status, body } = loginOutcomeToHttp(await login(request));
  res.status(status).json(body);
}
