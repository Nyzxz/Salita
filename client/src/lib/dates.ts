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
