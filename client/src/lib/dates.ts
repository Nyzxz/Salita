/** One date format for the whole app, in the viewer's own time zone. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** For example “Asia/Manila”, shown next to deadline pickers so nobody guesses. */
export function timeZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time';
  } catch {
    return 'your local time';
  }
}

/** “Grade 12 · Mabini” everywhere a grade and an optional section appear together. */
export function gradeWithSection(grade: string, classSection?: string): string {
  return classSection ? `${grade} · ${classSection}` : grade;
}

/** “in 2 days”, “in 5 hours”, “in 20 minutes”, or “overdue”. */
export function timeUntil(iso: string, now = Date.now()): { label: string; urgency: 'overdue' | 'soon' | 'week' | 'later' } {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { label: 'overdue', urgency: 'overdue' };
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return { label: `in ${Math.max(1, minutes)} min`, urgency: 'soon' };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { label: `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`, urgency: 'soon' };
  const days = Math.round(hours / 24);
  return { label: days === 1 ? 'tomorrow' : `in ${days} days`, urgency: days <= 3 ? 'week' : 'later' };
}
