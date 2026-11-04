import { useCallback, useEffect, useState } from 'react';
import type { CreateStudentRequest, StudentAccount } from '@shared/types';
import { createStudentAccount, deleteStudentAccount, fetchStudents, updateStudentAccount } from '../../api/admin';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { BackLink } from '../../components/layout/BackLink';
import { Notice } from '../../components/ui/Notice';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CheckIcon } from '../../components/common/icons';
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
  const [credentials, setCredentials] = useState<{ name: string; username: string; password: string; reason: string } | null>(null);
  const [toDelete, setToDelete] = useState<StudentAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

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
      setSuccessMessage(null);
      setCredentials({ name: created.fullName, username: created.username, password: request.password, reason: 'Account created' });
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
      setSuccessMessage(null);
      setCredentials({ name: student.fullName, username: student.username, password: newPassword, reason: 'Password reset' });
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not reset the password.');
    } finally {
      setPendingActionId(null);
    }
  };

  const activeCount = students?.filter((student) => student.status === 'ACTIVE').length ?? 0;

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setLoadError(null);
    try {
      await deleteStudentAccount(toDelete.id, token);
      setStudents((prev) => prev?.filter((s) => s.id !== toDelete.id) ?? null);
      setSuccessMessage(`${toDelete.fullName}'s account and records were deleted.`);
      setCredentials((current) => (current?.username === toDelete.username ? null : current));
      setToDelete(null);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not delete the account.');
      setToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.password}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the details are on screen to copy by hand.
    }
  };

  return (
    <DashboardShell
      eyebrow="Teacher workspace"
      title="User management"
      subtitle="Create student accounts and manage who can sign in."
      actions={<BackLink />}
    >
      {successMessage && <Notice tone="success" className="mb-6">{successMessage}</Notice>}

      {credentials && (
        <section aria-label="Sign-in details" className="mb-8 animate-scale-in rounded-2xl border border-gold/30 bg-gold/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{credentials.reason}</p>
              <h2 className="mt-1 text-lg font-semibold text-parchment">Give {credentials.name} these sign-in details</h2>
              <p className="mt-1 text-sm text-muted">
                This password is shown only now. {credentials.name.split(' ')[0]} will be asked to choose their own at first sign-in.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void copyCredentials()} className="btn-secondary btn-sm">
                {copied ? <CheckIcon className="h-3.5 w-3.5 text-leaf" /> : null}
                {copied ? 'Copied' : 'Copy details'}
              </button>
              <button type="button" onClick={() => setCredentials(null)} className="btn-ghost btn-sm">Dismiss</button>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-night-border bg-night-deep/60 px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-muted">Username</dt>
              <dd className="mt-1 font-mono text-parchment">{credentials.username}</dd>
            </div>
            <div className="rounded-xl border border-night-border bg-night-deep/60 px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-muted">Temporary password</dt>
              <dd className="mt-1 font-mono text-gold-soft">{credentials.password}</dd>
            </div>
          </dl>
        </section>
      )}

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
                onDelete={setToDelete}
              />
            )}
          </div>
        </section>
      </div>

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.fullName}?`}
          confirmLabel="Delete account"
          busyLabel="Deleting…"
          isBusy={isDeleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setToDelete(null)}
        >
          <p>
            This permanently removes <span className="font-medium text-parchment">{toDelete.fullName}</span> (@{toDelete.username}) along with
            their submissions, grades and quiz results. It can’t be undone.
          </p>
          <p className="mt-2">If they might come back, use <span className="font-medium text-parchment">Deactivate</span> instead.</p>
        </ConfirmDialog>
      )}
    </DashboardShell>
  );
}
