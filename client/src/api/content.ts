import type {
  ActivityTask,
  CreateActivityTaskRequest,
  CreateLectureRequest,
  LectureRecord,
  UpdateActivityTaskRequest,
} from '@shared/types';
import { apiDelete, apiGet, apiPost, apiPut } from './client';

export function fetchLectures(token?: string): Promise<LectureRecord[]> {
  return apiGet<LectureRecord[]>('/api/content/lectures', undefined, token);
}

export function createLecture(request: CreateLectureRequest, token?: string): Promise<LectureRecord> {
  return apiPost<LectureRecord>('/api/content/lectures', request, token);
}

export function updateLecture(id: string, request: CreateLectureRequest): Promise<LectureRecord> {
  return apiPut<LectureRecord>(`/api/content/lectures/${encodeURIComponent(id)}`, request);
}

export function deleteLecture(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/api/content/lectures/${encodeURIComponent(id)}`);
}

export function createActivityTask(request: CreateActivityTaskRequest, token?: string): Promise<ActivityTask> {
  return apiPost<ActivityTask>('/api/content/tasks', request, token);
}

/** The server needs the type too (it is validated but cannot change), so it is sent along. */
export function updateActivityTask(
  id: string,
  type: CreateActivityTaskRequest['type'],
  request: UpdateActivityTaskRequest,
): Promise<ActivityTask> {
  return apiPut<ActivityTask>(`/api/content/tasks/${encodeURIComponent(id)}`, { ...request, type });
}

export function deleteActivityTask(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/api/content/tasks/${encodeURIComponent(id)}`);
}
