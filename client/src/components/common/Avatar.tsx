import { useState } from 'react';
import { avatarUrl } from '../../api/auth';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  accent?: 'gold' | 'leaf';
  /** Pass both to show the person's uploaded picture instead of initials. */
  userId?: string;
  avatarVersion?: number;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-3xl',
} as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A profile picture when there is one, otherwise initials in a ringed circle. */
export function Avatar({ name, size = 'md', accent = 'gold', userId, avatarVersion }: AvatarProps) {
  const [failedVersion, setFailedVersion] = useState<number | null>(null);
  const tone = accent === 'gold' ? 'from-gold-soft to-gold text-night' : 'from-leaf to-[#6fbf8e] text-night';
  const showPhoto = Boolean(userId && avatarVersion && failedVersion !== avatarVersion);

  if (showPhoto && userId && avatarVersion) {
    return (
      <img
        src={avatarUrl(userId, avatarVersion)}
        alt=""
        onError={() => setFailedVersion(avatarVersion)}
        className={`flex-none rounded-full object-cover ring-2 ring-white/10 ${SIZE_CLASSES[size]}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-gradient-to-br font-body font-bold ring-2 ring-white/10 ${tone} ${SIZE_CLASSES[size]}`}
    >
      {initialsFor(name)}
    </span>
  );
}
