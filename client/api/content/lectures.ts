import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, LectureRecord, User } from '../../../shared/src/types.js';
import { getUserFromAuthHeader } from '../../../server/src/auth/auth.service.js';
import { createLecture, listLectures, parseCreateLectureRequest } from '../../../server/src/content/content.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    res.status(401).json({ success: false, data: null, error: 'You need to sign in to do that.' });
    return;
  }
  if (req.method === 'GET') {
    const body: ApiResponse<LectureRecord[]> = { success: true, data: await listLectures() };
    res.status(200).json(body);
    return;
  }
  if (req.method === 'POST' && user.role === 'TEACHER') {
    const request = parseCreateLectureRequest(req.body);
    if (!request) {
      res.status(400).json({ success: false, data: null, error: 'Provide the word, translation, phonetic guide, category, and cultural note.' });
      return;
    }
    const body: ApiResponse<LectureRecord> = { success: true, data: await createLecture(user as User, request) };
    res.status(201).json(body);
    return;
  }
  if (req.method === 'POST') {
    res.status(403).json({ success: false, data: null, error: 'Your account is not allowed to do that.' });
    return;
  }
  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ success: false, data: null, error: `Method ${req.method} not allowed.` });
}