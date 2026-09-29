import { useState } from 'react';
import type { StudentAccount } from '@shared/types';

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
    return <p className="text-sm text-muted">No students yet — add one above.</p>;
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
    <div className="overflow-x-auto rounded-xl border border-night-border">
      <table className="min-w-full divide-y divide-night-border text-left text-sm">
        <thead className="bg-night-panel text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Username</th>
            <th className="px-4 py-3 font-medium">Section</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-night-border bg-night">
          {students.map((student) => {
            const isPending = pendingActionId === student.id;
            const isResetting = resettingId === student.id;
            return (
              <tr key={student.id}>
                <td className="px-4 py-3">
                  <p className="text-parchment">{student.fullName}</p>
                  <p className="text-xs text-muted">{student.email}</p>
                </td>
                <td className="px-4 py-3 text-muted">{student.username}</td>
                <td className="px-4 py-3 text-muted">{student.section}</td>
                <td className="px-4 py-3 text-muted">{formatDate(student.createdAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      student.status === 'ACTIVE'
                        ? 'border-leaf/40 text-leaf'
                        : 'border-clay/40 text-clay'
                    }`}
                  >
                    {student.status === 'ACTIVE' ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isResetting ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-32 rounded-md border border-night-border bg-night-panel px-2 py-1 text-xs text-parchment"
                      />
                      <button
                        type="button"
                        onClick={() => confirmReset(student)}
                        disabled={newPassword.trim().length < 6}
                        className="text-xs text-gold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setResettingId(null)}
                        className="text-xs text-muted hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => startReset(student)}
                        disabled={isPending}
                        className="text-gold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(student)}
                        disabled={isPending}
                        className="text-clay hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending
                          ? 'Saving…'
                          : student.status === 'ACTIVE'
                            ? 'Deactivate'
                            : 'Reactivate'}
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
