import { GRADE_LEVELS, type GradeLevel, type ImportStudentRow } from '@shared/types';
import { parseCsv } from './csv';

const HEADER_ALIASES: Record<string, 'fullName' | 'username' | 'email' | 'section' | 'classSection'> = {
  fullname: 'fullName',
  name: 'fullName',
  studentname: 'fullName',
  username: 'username',
  user: 'username',
  email: 'email',
  emailaddress: 'email',
  grade: 'section',
  gradelevel: 'section',
  section: 'section',
  classsection: 'classSection',
  sectionname: 'classSection',
  class: 'classSection',
  classname: 'classSection',
};

/** Accepts "Grade 9", "grade9" or just "9". */
export function normalizeGrade(value: string): GradeLevel | null {
  const digits = value.replace(/\D/g, '');
  const match = GRADE_LEVELS.find((grade) => grade === `Grade ${digits}`);
  return match ?? null;
}

export interface ParsedImport {
  rows: ImportStudentRow[];
  /** Problems found before anything is sent, with the CSV line number. */
  problems: string[];
}

export const MAX_IMPORT_FILE_ROWS = 500;

/** Reads a CSV with a header row (full name, username, email, grade, optional section) into import rows. */
export function parseImportCsv(text: string): ParsedImport {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], problems: ['The file needs a header row and at least one student.'] };

  const headings = table[0].map((heading) => heading.toLowerCase().replace(/[^a-z]/g, ''));
  const hasGradeColumn = headings.includes('grade') || headings.includes('gradelevel');
  const columns = headings.map((heading) => {
    // A bare "section" column means the grade in older files, but the class section when a grade column exists too.
    if (heading === 'section') return hasGradeColumn ? 'classSection' : 'section';
    return HEADER_ALIASES[heading];
  });
  const missing = (['fullName', 'username', 'email', 'section'] as const).filter((key) => !columns.includes(key));
  if (missing.length > 0) {
    return { rows: [], problems: ['The header row must have these columns: full name, username, email, grade (section is optional).'] };
  }
  if (table.length - 1 > MAX_IMPORT_FILE_ROWS) {
    return { rows: [], problems: [`Import at most ${MAX_IMPORT_FILE_ROWS} students at a time.`] };
  }

  const rows: ImportStudentRow[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const get = (key: string): string => (cells[columns.indexOf(key as never)] ?? '').trim();
    const grade = normalizeGrade(get('section'));
    const classSection = get('classSection').replace(/\s+/g, ' ');
    const username = get('username').toLowerCase();
    if (!get('fullName') || !username || !get('email')) {
      problems.push(`Line ${line}: name, username and email are all required.`);
    } else if (!grade) {
      problems.push(`Line ${line}: grade must be Grade 7 to Grade 12.`);
    } else if (seen.has(username)) {
      problems.push(`Line ${line}: username "${username}" appears more than once.`);
    } else {
      seen.add(username);
      rows.push({ fullName: get('fullName'), username, email: get('email'), section: grade, ...(classSection ? { classSection } : {}) });
    }
  });
  return { rows, problems };
}
