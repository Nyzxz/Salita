import { useEffect, useState } from 'react';
import { downloadAttachment } from '../../api/tasks';

/** Plays an attached voice recording by fetching it with the user's session. */
export function AttachmentAudio({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    downloadAttachment(id)
      .then((blob) => {
        if (!active) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id]);

  if (failed) return <p className="text-xs text-clay">Could not load the recording.</p>;
  if (!url) return <p className="text-xs text-muted">Loading recording…</p>;
  return <audio controls src={url} className="h-9 max-w-full" />;
}
