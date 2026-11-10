import { useState, type FormEvent } from 'react';
import { GRADE_LEVELS, type ClassSectionRecord, type GradeLevel } from '@shared/types';
import { createSection, deleteSection } from '../../api/admin';
import { ApiRequestError } from '../../api/client';
import { Notice } from '../ui/Notice';

interface SectionsPanelProps {
  sections: ClassSectionRecord[];
  onChanged: () => void;
}

/** Teachers make the class sections (for example “Sampaguita”) that each grade is split into. */
export function SectionsPanel({ sections, onChanged }: SectionsPanelProps) {
  const [grade, setGrade] = useState<GradeLevel | ''>('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (grade === '') return;
    setError(null);
    setIsSaving(true);
    try {
      await createSection(grade, name.trim());
      setName('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not add the section.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (section: ClassSectionRecord) => {
    setError(null);
    try {
      await deleteSection(section.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not remove the section.');
    }
  };

  const grouped = GRADE_LEVELS.map((level) => ({ level, items: sections.filter((section) => section.grade === level) })).filter(
    (group) => group.items.length > 0,
  );

  return (
    <section aria-labelledby="sections-heading" className="surface p-6">
      <h3 id="sections-heading" className="text-lg font-semibold text-parchment">Class sections</h3>
      <p className="mt-1 text-sm text-muted">Split a grade into sections, then pick one when you add a student.</p>

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap gap-2">
        <label className="min-w-[8rem] flex-1">
          <span className="sr-only">Grade</span>
          <select required value={grade} onChange={(event) => setGrade(event.target.value as GradeLevel | '')} className="field">
            <option value="" disabled>Grade…</option>
            {GRADE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
        <label className="min-w-[8rem] flex-1">
          <span className="sr-only">Section name</span>
          <input required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sampaguita" className="field" />
        </label>
        <button type="submit" disabled={isSaving || grade === '' || name.trim() === ''} className="btn-secondary">
          {isSaving ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

      {grouped.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No sections yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {grouped.map((group) => (
            <li key={group.level}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group.level}</p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {group.items.map((section) => (
                  <li key={section.id} className="badge-neutral gap-1.5">
                    {section.name}
                    <button
                      type="button"
                      onClick={() => void handleDelete(section)}
                      aria-label={`Remove section ${section.name} from ${section.grade}`}
                      title="Remove (students keep their account and grade)"
                      className="text-muted transition hover:text-clay"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
