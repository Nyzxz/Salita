import type {
  ActivityTask,
  AttachmentInfo,
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  PageMeta,
  SubmissionRecord,
  TaskType,
  UploadAttachmentRequest,
} from '@shared/types';
import { apiDownload, apiGet, apiGetPage, apiPost, apiPut } from './client';

export function fetchTasks(token?: string): Promise<ActivityTask[]> {
  return apiGet<ActivityTask[]>('/api/tasks', undefined, token);
}

export function fetchMySubmissions(token?: string): Promise<SubmissionRecord[]> {
  return apiGet<SubmissionRecord[]>('/api/submissions/me', undefined, token);
}

export interface SubmissionQuery {
  page?: number;
  limit?: number;
  taskType?: TaskType;
  status?: 'PENDING' | 'GRADED';
}

/** The teacher's submissions, one page at a time. */
export async function fetchSubmissionPage(
  query: SubmissionQuery = {},
): Promise<{ items: SubmissionRecord[]; meta: PageMeta }> {
  const params: Record<string, string> = { page: String(query.page ?? 1), limit: String(query.limit ?? 50) };
  if (query.taskType) params.taskType = query.taskType;
  if (query.status) params.status = query.status;
  const { data, meta } = await apiGetPage<SubmissionRecord[]>('/api/admin/submissions', params);
  return { items: data, meta: meta ?? { total: data.length, page: 1, limit: data.length } };
}

export function submitTaskWork(
  request: CreateSubmissionRequest,
  token?: string,
): Promise<SubmissionRecord> {
  return apiPost<SubmissionRecord>('/api/submissions', request, token);
}

export function uploadAttachment(request: UploadAttachmentRequest): Promise<AttachmentInfo> {
  return apiPost<AttachmentInfo>('/api/submissions?route=attachment', request);
}

export function downloadAttachment(id: string): Promise<Blob> {
  return apiDownload('/api/submissions', { route: 'attachment', id });
}

export function gradeSubmission(
  submissionId: string,
  request: GradeSubmissionRequest,
  token?: string,
): Promise<SubmissionRecord> {
  return apiPut<SubmissionRecord>(`/api/admin/submissions/${submissionId}`, request, token);
}
