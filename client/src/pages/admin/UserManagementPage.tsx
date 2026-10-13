import { useCallback, useEffect, useState } from 'react';
import type { CreateStudentRequest, StudentAccount } from '@shared/types';
import { createStudentAccount, fetchStudents, updateStudentAccount } from '../../api/admin';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { BackLink } from '../../components/layout/BackLink';
import { Notice } from '../../components/ui/Notice';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { CreateStudentForm } from '../../components/admin/CreateStudentForm';
import { StudentDirectoryTable } from '../../components/admin/StudentDirectoryTable';

export function UserManagementPage() {
  const { session } = useAuth();
  const token = session?.token ?? '';

  const [students, setStudents] = useState<StudentAccount[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchStudents(token)
      .then(setStudents)
      .catch((err: unknown) => {
        setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load students.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (request: CreateStudentRequest) => {
    setFormError(null);
    setSuccessMessage(null);
    setIsSaving(true);
    try {
      const created = await createStudentAccount(request, token);
      setStudents((prev) => (prev ? [...prev, created] : [created]));
      setSuccessMessage(`${created.fullName}'s account was created.`);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Could not create the account.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (student: StudentAccount) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setPendingActionId(student.id);
    setLoadError(null);
    try {
      const updated = await updateStudentAccount(student.id, { status: nextStatus }, token);
      setStudents((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not update the account.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleResetPassword = async (student: StudentAccount, newPassword: string) => {
    setPendingActionId(student.id);
    setLoadError(null);
    try {
      const updated = await updateStudentAccount(student.id, { password: newPassword }, token);
      setStudents((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
      setSuccessMessage(`Password reset for ${student.fullName}.`);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not reset the password.');
    } finally {
      setPendingActionId(null);
    }
  };

  const activeCount = students?.filter((student) => student.status === 'ACTIVE').length ?? 0;

  return (
    <DashboardShell
      eyebrow="Teacher workspace"
      title="User management"
      subtitle="Create student accounts and manage who can sign in."
      actions={<BackLink />}
    >
      {successMessage && <Notice tone="success" className="mb-6">{successMessage}</Notice>}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section aria-labelledby="add-student-heading">
          <h2 id="add-student-heading" className="text-xl font-semibold text-parchment">Add a student</h2>
          <p className="mt-1 text-sm text-muted">They can sign in right away with these details.</p>
          <div className="surface mt-5 p-6">
            <CreateStudentForm onSubmit={handleCreate} isSaving={isSaving} error={formError} />
          </div>
        </section>

        <section aria-labelledby="directory-heading" className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="directory-heading" className="text-xl font-semibold text-parchment">Student directory</h2>
              <p className="mt-1 text-sm text-muted">Reset passwords and activate or deactivate accounts.</p>
            </div>
            {students && (
              <div className="flex gap-2">
                <span className="badge-neutral">{students.length} total</span>
                <span className="badge-leaf">{activeCount} active</span>
              </div>
            )}
          </div>
          <div className="mt-5">
            {isLoading && <LoadingState label="Loading students…" />}
            {loadError && <ErrorState message={loadError} onRetry={load} />}
            {students && !isLoading && !loadError && (
              <StudentDirectoryTable
                students={students}
                pendingActionId={pendingActionId}
                onToggleStatus={handleToggleStatus}
                onResetPassword={handleResetPassword}
              />
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
