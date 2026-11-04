/** Mirrors passwordProblem() on the server (server/src/auth/auth.service.ts). The server is the real gate. */
export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export function passwordRules(next: string, current: string, username: string): PasswordRule[] {
  return [
    { id: 'length', label: 'At least 8 characters', met: next.length >= 8 },
    { id: 'mix', label: 'A letter and a number', met: /[A-Za-z]/.test(next) && /\d/.test(next) },
    {
      id: 'different',
      label: 'Different from your current password',
      met: next.length > 0 && next !== current,
    },
    {
      id: 'username',
      label: 'Does not contain your username',
      met: next.length > 0 && !next.toLowerCase().includes(username.toLowerCase()),
    },
  ];
}

/** Random default password for a new or reset student, e.g. "Salita-ana-4821". */
export function generateDefaultPassword(fullName: string, username: string): string {
  const base = (username || fullName).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'student';
  const digits = new Uint32Array(1);
  window.crypto.getRandomValues(digits);
  const suffix = String(1000 + (digits[0] % 9000));
  return `Salita-${base}-${suffix}`;
}
