import { useRef, useState, type ChangeEvent } from 'react';
import type { ImportStudentResult, ImportStudentRow } from '@shared/types';
import { importStudents } from '../../api/admin';
import { saveBlob, ApiRequestError } from '../../api/client';
import { csvBlob } from '../../lib/csv';
import { parseImportCsv } from '../../lib/importRows';
import { DownloadIcon, UploadIcon } from '../common/icons';
import { Notice } from '../ui/Notice';

const BATCH_SIZE = 10;

interface ImportStudentsPanelProps {
  /** Called after accounts were created, so the directory can refresh. */
  onImported: () => void;
}

const TEMPLATE = [
  ['full name', 'username', 'email', 'grade'],
  ['Ana Reyes', 'ana.reyes', 'ana@example.com', 'Grade 9'],
];

export function ImportStudentsPanel({ onImported }: ImportStudentsPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportStudentRow[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<ImportStudentResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRunning = progress !== null && progress.done < progress.total;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setResults(null);
    setError(null);
    setFileName(file.name);
    if (file.size > 512 * 1024) {
      setRows([]);
      setProblems(['That file is too large for a student list.']);
      return;
    }
    const parsed = parseImportCsv(await file.text());
    setRows(parsed.rows);
    setProblems(parsed.problems);
  };

  const runImport = async () => {
    setError(null);
    setResults(null);
    const collected: ImportStudentResult[] = [];
    setProgress({ done: 0, total: rows.length });
    try {
      for (let start = 0; start < rows.length; start += BATCH_SIZE) {
        const batch = rows.slice(start, start + BATCH_SIZE);
        collected.push(...(await importStudents(batch)));
        setProgress({ done: Math.min(start + BATCH_SIZE, rows.length), total: rows.length });
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'The import stopped early.');
    } finally {
      setResults(collected);
      setProgress(null);
      setRows([]);
      if (collected.some((result) => result.status === 'created')) onImported();
    }
  };

  const created = results?.filter((result) => result.status === 'created') ?? [];
  const skipped = results?.filter((result) => result.status === 'skipped') ?? [];

  const downloadCredentials = () => {
    saveBlob(
      csvBlob([
        ['username', 'temporary password'],
        ...created.map((result) => [result.username, result.password ?? '']),
      ]),
      'salita-new-student-passwords.csv',
    );
  };

  return (
    <section aria-labelledby="import-heading" className="surface p-6">
      <h2 id="import-heading" className="text-xl font-semibold text-parchment">Import from CSV</h2>
      <p className="mt-1 text-sm text-muted">
        Add a whole class at once. Columns: full name, username, email, grade. Each student gets a default password they
        must change at first sign-in.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={(event) => void handleFile(event)} className="sr-only" aria-label="Choose a CSV file" />
        <button type="button" className="btn-secondary btn-sm" disabled={isRunning} onClick={() => fileInput.current?.click()}>
          <UploadIcon className="h-3.5 w-3.5" /> Choose CSV file
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => saveBlob(csvBlob(TEMPLATE), 'salita-student-import-template.csv')}>
          <DownloadIcon className="h-3.5 w-3.5" /> Template
        </button>
      </div>

      {fileName && <p className="mt-3 text-xs text-muted">{fileName}</p>}

      {problems.length > 0 && (
        <Notice tone="error" className="mt-4">
          <ul className="list-disc space-y-0.5 pl-4">
            {problems.slice(0, 8).map((problem) => <li key={problem}>{problem}</li>)}
            {problems.length > 8 && <li>…and {problems.length - 8} more.</li>}
          </ul>
        </Notice>
      )}

      {rows.length > 0 && !isRunning && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-parchment">{rows.length} student{rows.length === 1 ? '' : 's'} ready to import.</p>
          <button type="button" className="btn-primary btn-sm" onClick={() => void runImport()}>Create accounts</button>
        </div>
      )}

      {progress && (
        <div className="mt-4" role="status" aria-live="polite">
          <p className="text-sm text-muted">Creating accounts… {progress.done} of {progress.total}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night-border">
            <div className="h-full bg-gold transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {error && <Notice tone="error" className="mt-4">{error}</Notice>}

      {results && (
        <div className="mt-5 space-y-3">
          <Notice tone={created.length > 0 ? 'success' : 'error'}>
            {created.length} account{created.length === 1 ? '' : 's'} created{skipped.length > 0 ? `, ${skipped.length} skipped` : ''}.
          </Notice>
          {created.length > 0 && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
              <p className="text-parchment">The default passwords are shown only now. Download them and hand them out.</p>
              <button type="button" className="btn-secondary btn-sm mt-3" onClick={downloadCredentials}>
                <DownloadIcon className="h-3.5 w-3.5" /> Download passwords (CSV)
              </button>
            </div>
          )}
          {skipped.length > 0 && (
            <ul className="space-y-1 text-sm text-muted">
              {skipped.map((result, index) => (
                <li key={`${result.username}-${index}`}><span className="font-mono text-parchment">{result.username || '(blank)'}</span> — {result.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
