import { useState, type FormEvent } from 'react';
import { updateMyProfile } from '../../api/auth';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../common/Avatar';
import { PageIntro } from '../ui/PageIntro';
import { Notice } from '../ui/Notice';

export function ProfileSection() {
  const { session, updateUser } = useAuth();
  const user = session?.user;
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user || !session) return null;

  const hasChanges = fullName.trim() !== user.name || email.trim().toLowerCase() !== (user.email ?? '').toLowerCase();

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const updated = await updateMyProfile({ fullName: fullName.trim(), email: email.trim() }, session.token);
      updateUser(updated);
      setFullName(updated.name);
      setEmail(updated.email ?? '');
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-labelledby="profile-heading" className="flex flex-col gap-8">
      <PageIntro
        id="profile-heading"
        eyebrow="Account"
        title="My profile"
        description="Keep your contact details up to date."
      />

      <div className="surface flex flex-wrap items-center gap-5 p-6">
        <Avatar name={user.name} size="lg" accent="leaf" />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-parchment">{user.name}</p>
          <p className="mt-1 text-sm text-muted">@{user.username}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className="badge-leaf">Student</span>
          {user.section && <span className="badge-gold">{user.section}</span>}
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="surface flex flex-col gap-5 p-6" aria-labelledby="details-heading">
          <div>
            <h3 id="details-heading" className="text-lg font-semibold text-parchment">Personal details</h3>
            <p className="mt-1 text-sm text-muted">Your username and grade are set by your teacher.</p>
          </div>

          <label className="block">
            <span className="field-label">Full name</span>
            <input required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} className="field" />
          </label>
          <label className="block">
            <span className="field-label">Email address</span>
            <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="field" />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Username</span>
              <input value={user.username} readOnly disabled className="field cursor-not-allowed opacity-60" />
            </label>
            <label className="block">
              <span className="field-label">Grade</span>
              <input value={user.section ?? 'Not set'} readOnly disabled className="field cursor-not-allowed opacity-60" />
            </label>
          </div>

          {error && <Notice tone="error">{error}</Notice>}
          {saved && !hasChanges && <Notice tone="success">Profile saved.</Notice>}

          <button type="submit" disabled={isSaving || !hasChanges} className="btn-primary sm:self-start">
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

      </div>
    </section>
  );
}
