import { useState } from 'react';
import { updateMyProfile } from '../../api/auth';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AVATAR_PRESETS } from '../../lib/avatars';
import { Avatar } from '../common/Avatar';

/** Pick a colour for the initials circle. Saved to the account straight away. */
export function AvatarPicker() {
  const { session, updateUser } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = session?.user;
  if (!user || !session) return null;

  const choose = async (id: string) => {
    if (id === (user.avatar ?? '')) return;
    setError(null);
    setSaving(id);
    try {
      updateUser(await updateMyProfile({ avatar: id }, session.token));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save your avatar.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <p className="field-label">Avatar colour</p>
      <div role="radiogroup" aria-label="Avatar colour" className="flex flex-wrap gap-2.5">
        {AVATAR_PRESETS.map((preset) => {
          const selected = (user.avatar ?? 'gold') === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.label}
              disabled={saving !== null}
              onClick={() => void choose(preset.id)}
              className={`rounded-full p-0.5 transition ${selected ? 'ring-2 ring-gold' : 'ring-1 ring-transparent hover:ring-white/30'}`}
            >
              <Avatar name={user.name} size="md" preset={preset.id} />
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-clay">{error}</p>}
    </div>
  );
}
