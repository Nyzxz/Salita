import type { ActivityTask, CreateActivityTaskRequest, CreateLectureRequest, LectureRecord } from '@shared/types';
import { apiGet, apiPost } from './client';

export function fetchLectures(token: string): Promise<LectureRecord[]> {
  return apiGet<LectureRecord[]>('/api/content/lectures', undefined, token);
}

export function createLecture(request: CreateLectureRequest, token: string): Promise<LectureRecord> {
  return apiPost<LectureRecord>('/api/content/lectures', request, token);
}

export function createActivityTask(request: CreateActivityTaskRequest, token: string): Promise<ActivityTask> {
  return apiPost<ActivityTask>('/api/content/tasks', request, token);
}