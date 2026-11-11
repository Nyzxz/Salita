/** Avatar colour presets. Class names are written out in full so Tailwind keeps them. */
export const AVATAR_PRESETS = [
  { id: 'gold', label: 'Gold', cls: 'from-gold-soft to-gold text-night' },
  { id: 'leaf', label: 'Green', cls: 'from-leaf to-[#6fbf8e] text-night' },
  { id: 'clay', label: 'Clay', cls: 'from-[#e58a6d] to-[#c2563a] text-night' },
  { id: 'sky', label: 'Sky', cls: 'from-[#8fd0f0] to-[#4a9fd0] text-night' },
  { id: 'violet', label: 'Violet', cls: 'from-[#c3a6f0] to-[#8a62d6] text-night' },
  { id: 'rose', label: 'Rose', cls: 'from-[#f4a6c0] to-[#d6628a] text-night' },
] as const;

export function avatarClass(id: string | undefined): string | undefined {
  return AVATAR_PRESETS.find((preset) => preset.id === id)?.cls;
}
