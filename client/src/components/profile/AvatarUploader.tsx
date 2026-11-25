import { useRef, useState, type ChangeEvent } from 'react';
import { deleteAvatar, uploadAvatar } from '../../api/auth';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { squareJpegBase64 } from '../../lib/imageResize';
import { Avatar } from '../common/Avatar';
import { CameraIcon } from '../common/icons';

/** Big profile picture with a camera button to choose a new one, and an option to remove it. */
export function AvatarUploader({ accent = 'leaf' }: { accent?: 'gold' | 'leaf' }) {
  const { session, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = session?.user;
  if (!user) return null;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      updateUser(await uploadAvatar(await squareJpegBase64(file)));
    } catch (err) {
      setError(err instanceof ApiRequestError || err instanceof Error ? err.message : 'Could not save your picture.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setBusy(true);
    try {
      updateUser(await deleteAvatar());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not remove your picture.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar name={user.name} size="xl" accent={accent} userId={user.id} avatarVersion={user.avatarVersion} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Change profile picture"
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-night-border bg-night-deep text-gold shadow-lg transition hover:bg-gold hover:text-night focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60"
        >
          <CameraIcon className="h-4 w-4" />
        </button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void handleFile(event)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-parchment">Profile picture</p>
        <p className="mt-0.5 text-xs text-muted">{busy ? 'Saving…' : 'JPG or PNG. It is cropped to a square.'}</p>
        {user.avatarVersion ? (
          <button type="button" onClick={() => void handleRemove()} disabled={busy} className="mt-1 text-xs text-clay hover:underline">
            Remove picture
          </button>
        ) : null}
        {error && <p role="alert" className="mt-1 text-xs text-clay">{error}</p>}
      </div>
    </div>
  );
}
