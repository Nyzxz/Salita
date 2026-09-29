interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  accent?: 'gold' | 'leaf';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A soft-gradient initials circle, standing in for a photo avatar. */
export function Avatar({ name, size = 'md', accent = 'gold' }: AvatarProps) {
  const gradient =
    accent === 'gold'
      ? 'from-gold to-clay text-night'
      : 'from-leaf to-gold-soft text-night';

  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold ${gradient} ${SIZE_CLASSES[size]}`}
    >
      {initialsFor(name)}
    </span>
  );
}
