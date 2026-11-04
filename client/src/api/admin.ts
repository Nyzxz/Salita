import type { CreateStudentRequest, StudentAccount, UpdateStudentRequest } from '@shared/types';
import { apiDelete, apiGet, apiPost, apiPut } from './client';

export function fetchStudents(token: string): Promise<StudentAccount[]> {
  return apiGet<StudentAccount[]>('/api/admin/students', undefined, token);
}

export function createStudentAccount(
  request: CreateStudentRequest,
  token: string,
): Promise<StudentAccount> {
  return apiPost<StudentAccount>('/api/admin/students', request, token);
}

export function updateStudentAccount(
  id: string,
  patch: UpdateStudentRequest,
  token: string,
): Promise<StudentAccount> {
  return apiPut<StudentAccount>(`/api/admin/students/${id}`, patch, token);
}

export function deleteStudentAccount(id: string, token: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/api/admin/students/${id}`, token);
}
