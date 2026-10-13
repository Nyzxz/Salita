import { useState } from 'react';
import type { StudentAccount } from '@shared/types';
import { Avatar } from '../common/Avatar';
import { UsersIcon } from '../common/icons';
import { EmptyState } from '../ui/EmptyState';

interface StudentDirectoryTableProps {
  students: StudentAccount[];
  pendingActionId: string | null;
  onToggleStatus: (student: StudentAccount) => void;
  onResetPassword: (student: StudentAccount, newPassword: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function StudentDirectoryTable({
  students,
  pendingActionId,
  onToggleStatus,
  onResetPassword,
}: StudentDirectoryTableProps) {
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  if (students.length === 0) {
    return <EmptyState icon={<UsersIcon />} title="No students yet" description="Add your first student with the form to get started." />;
  }

  const startReset = (student: StudentAccount) => {
    setResettingId(student.id);
    setNewPassword('');
  };

  const confirmReset = (student: StudentAccount) => {
    if (newPassword.trim().length < 6) return;
    onResetPassword(student, newPassword.trim());
    setResettingId(null);
    setNewPassword('');
  };

  return (
    <div className="table-wrap overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Section</th>
            <th>Created</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const isPending = pendingActionId === student.id;
            const isResetting = resettingId === student.id;
            return (
              <tr key={student.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={student.fullName} size="sm" accent="leaf" />
                    <div className="min-w-0">
                      <p className="font-medium text-parchment">{student.fullName}</p>
                      <p className="truncate text-xs text-muted">@{student.username} · {student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="text-muted">{student.section}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(student.createdAt)}</td>
                <td>
                  <span className={student.status === 'ACTIVE' ? 'badge-leaf' : 'badge-clay'}>
                    {student.status === 'ACTIVE' ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td>
                  {isResetting ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (6+)"
                        aria-label={`New password for ${student.fullName}`}
                        className="field w-40 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => confirmReset(student)}
                        disabled={newPassword.trim().length < 6}
                        className="btn-primary btn-sm"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setResettingId(null)} className="btn-ghost btn-sm">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startReset(student)} disabled={isPending} className="btn-secondary btn-sm">
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(student)}
                        disabled={isPending}
                        className={student.status === 'ACTIVE' ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'}
                      >
                        {isPending ? 'Saving…' : student.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
