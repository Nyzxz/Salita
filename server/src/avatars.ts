/** Avatar presets a user can pick. The picture itself is drawn by the client from the id. */
export const AVATAR_IDS = ['gold', 'leaf', 'clay', 'sky', 'violet', 'rose'] as const;

export function isAvatarId(value: unknown): value is (typeof AVATAR_IDS)[number] {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}
