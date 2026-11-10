import type {
  CreateStudentRequest,
  ClassSectionRecord,
  GradeLevel,
  ImportStudentResult,
  ImportStudentRow,
  PageMeta,
  StudentAccount,
  UpdateStudentRequest,
} from '@shared/types';
import { apiDelete, apiDownload, apiGet, apiGetPage, apiPost, apiPut } from './client';

export interface StudentQuery {
  page?: number;
  limit?: number;
  q?: string;
  section?: GradeLevel | '';
  classSection?: string;
  status?: StudentAccount['status'] | '';
}

export async function fetchStudents(
  query: StudentQuery = {},
  _token?: string,
): Promise<{ items: StudentAccount[]; meta: PageMeta }> {
  const params: Record<string, string> = { page: String(query.page ?? 1), limit: String(query.limit ?? 50) };
  if (query.q?.trim()) params.q = query.q.trim();
  if (query.section) params.section = query.section;
  if (query.classSection) params.classSection = query.classSection;
  if (query.status) params.status = query.status;
  const { data, meta } = await apiGetPage<StudentAccount[]>('/api/admin/students', params);
  return { items: data, meta: meta ?? { total: data.length, page: 1, limit: data.length } };
}

export function createStudentAccount(
  request: CreateStudentRequest,
  token?: string,
): Promise<StudentAccount> {
  return apiPost<StudentAccount>('/api/admin/students', request, token);
}

export function updateStudentAccount(
  id: string,
  patch: UpdateStudentRequest,
  token?: string,
): Promise<StudentAccount> {
  return apiPut<StudentAccount>(`/api/admin/students/${id}`, patch, token);
}

export function deleteStudentAccount(id: string, token?: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/api/admin/students/${id}`, token);
}

/** Creates up to 10 accounts at a time (each one is slow to hash on the server). */
export function importStudents(students: ImportStudentRow[]): Promise<ImportStudentResult[]> {
  return apiPost<ImportStudentResult[]>('/api/admin/students?action=import', { students });
}

export function downloadGradebook(): Promise<Blob> {
  return apiDownload('/api/admin/students', { export: 'gradebook' });
}

export function fetchSections(): Promise<ClassSectionRecord[]> {
  return apiGet<ClassSectionRecord[]>('/api/admin/students', { resource: 'sections' });
}

export function createSection(grade: GradeLevel, name: string): Promise<ClassSectionRecord> {
  return apiPost<ClassSectionRecord>('/api/admin/students?resource=sections', { grade, name });
}

export function deleteSection(id: string): Promise<{ id: string; studentsCleared: number }> {
  return apiDelete<{ id: string; studentsCleared: number }>(`/api/admin/students?resource=sections&id=${encodeURIComponent(id)}`);
}
