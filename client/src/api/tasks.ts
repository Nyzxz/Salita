import type {
  ActivityTask,
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  SubmissionRecord,
} from '@shared/types';
import { apiGet, apiPost, apiPut } from './client';

export function fetchTasks(token: string): Promise<ActivityTask[]> {
  return apiGet<ActivityTask[]>('/api/tasks', undefined, token);
}

export function fetchMySubmissions(token: string): Promise<SubmissionRecord[]> {
  return apiGet<SubmissionRecord[]>('/api/submissions/me', undefined, token);
}

export function fetchAllSubmissions(token: string): Promise<SubmissionRecord[]> {
  return apiGet<SubmissionRecord[]>('/api/admin/submissions', undefined, token);
}

export function submitTaskWork(
  request: CreateSubmissionRequest,
  token: string,
): Promise<SubmissionRecord> {
  return apiPost<SubmissionRecord>('/api/submissions', request, token);
}

export function gradeSubmission(
  submissionId: string,
  request: GradeSubmissionRequest,
  token: string,
): Promise<SubmissionRecord> {
  return apiPut<SubmissionRecord>(`/api/admin/submissions/${submissionId}`, request, token);
}
