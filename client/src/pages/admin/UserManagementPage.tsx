import { useCallback, useEffect, useRef, useState } from 'react';
import { GRADE_LEVELS, type ClassSectionRecord, type CreateStudentRequest, type GradeLevel, type StudentAccount } from '@shared/types';
import { createStudentAccount, deleteStudentAccount, downloadGradebook, fetchSections, fetchStudents, updateStudentAccount } from '../../api/admin';
import { ApiRequestError, saveBlob } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { BackLink } from '../../components/layout/BackLink';
import { Notice } from '../../components/ui/Notice';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CheckIcon, DownloadIcon, SearchIcon } from '../../components/common/icons';
import { ImportStudentsPanel } from '../../components/admin/ImportStudentsPanel';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { SectionsPanel } from '../../components/admin/SectionsPanel';
import { CreateStudentForm } from '../../components/admin/CreateStudentForm';
import { StudentDirectoryTable } from '../../components/admin/StudentDirectoryTable';

export function UserManagementPage() {
  const { session } = useAuth();
  const token = session?.token ?? '';

  const [students, setStudents] = useState<StudentAccount[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<GradeLevel | ''>('');
  const [classFilter, setClassFilter] = useState('');
  const [sections, setSections] = useState<ClassSectionRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StudentAccount['status'] | ''>('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const requestId = useRef(0);
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

  const loadSections = useCallback(() => {
    fetchSections().then(setSections).catch(() => undefined);
  }, []);
  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // A section filter only makes sense inside the chosen grade.
  useEffect(() => {
    if (classFilter && !sections.some((s) => s.name === classFilter && (!sectionFilter || s.grade === sectionFilter))) setClassFilter('');
  }, [sectionFilter, sections, classFilter]);

  // Wait for a pause in typing before asking the server to search.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    const id = (requestId.current += 1);
    setIsLoading(true);
    setLoadError(null);
    setPage(1);
    fetchStudents({ page: 1, q: debouncedSearch, section: sectionFilter, classSection: classFilter, status: statusFilter })
      .then(({ items, meta }) => {
        if (id !== requestId.current) return;
        setStudents(items);
        setTotal(meta.total);
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load students.');
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false);
      });
  }, [debouncedSearch, sectionFilter, classFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const { items, meta } = await fetchStudents({ page: page + 1, q: debouncedSearch, section: sectionFilter, classSection: classFilter, status: statusFilter });
      setStudents((prev) => [...(prev ?? []), ...items.filter((item) => !prev?.some((existing) => existing.id === item.id))]);
      setTotal(meta.total);
      setPage(page + 1);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load more students.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const exportGradebook = async () => {
    setIsExporting(true);
    setLoadError(null);
    try {
      saveBlob(await downloadGradebook(), 'salita-gradebook.csv');
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not export the gradebook.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreate = async (request: CreateStudentRequest) => {
    setFormError(null);
    setSuccessMessage(null);
    setIsSaving(true);
    try {
      const created = await createStudentAccount(request, token);
      setStudents((prev) => (prev ? [created, ...prev] : [created]));
      setTotal((count) => count + 1);
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
      setTotal((count) => Math.max(0, count - 1));
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
      actions={
        <>
          <BackLink />
          <button type="button" className="btn-secondary btn-sm" disabled={isExporting} onClick={() => void exportGradebook()}>
            <DownloadIcon className="h-3.5 w-3.5" /> {isExporting ? 'Preparing…' : 'Export gradebook (CSV)'}
          </button>
        </>
      }
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
            <CreateStudentForm onSubmit={handleCreate} isSaving={isSaving} error={formError} sections={sections} />
          </div>
          <div className="mt-8">
            <SectionsPanel sections={sections} onChanged={() => { loadSections(); load(); }} />
          </div>
          <div className="mt-8">
            <ImportStudentsPanel onImported={() => { loadSections(); load(); }} />
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
                <span className="badge-neutral">{total} total</span>
                <span className="badge-leaf">{activeCount} active shown</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="relative min-w-[12rem] flex-1">
              <span className="sr-only">Search students</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, username or email"
                maxLength={80}
                className="field pl-9"
              />
            </label>
            <label>
              <span className="sr-only">Filter by grade</span>
              <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value as GradeLevel | '')} className="field">
                <option value="">All grades</option>
                {GRADE_LEVELS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by section</span>
              <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="field">
                <option value="">All sections</option>
                {[...new Set(sections.filter((s) => !sectionFilter || s.grade === sectionFilter).map((s) => s.name))].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StudentAccount['status'] | '')} className="field">
                <option value="">Any status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Deactivated</option>
              </select>
            </label>
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
            {students && !isLoading && !loadError && students.length < total && (
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
                <span>Showing {students.length} of {total}</span>
                <button type="button" className="btn-secondary btn-sm" disabled={isLoadingMore} onClick={() => void loadMore()}>
                  {isLoadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
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
