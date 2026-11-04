import { GRADE_LEVELS, type ContentGrade } from '@shared/types';

interface GradeSelectProps {
  /** '' means "nothing chosen yet" and forces the teacher to pick before publishing. */
  value: ContentGrade | '';
  onChange: (value: ContentGrade) => void;
  label?: string;
  className?: string;
}

export function GradeSelect({ value, onChange, label = 'Grade level', className = '' }: GradeSelectProps) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value as ContentGrade)}
        className="field"
      >
        <option value="" disabled>
          Select grade level…
        </option>
        <option value="ALL">All grades</option>
        {GRADE_LEVELS.map((grade) => (
          <option key={grade} value={grade}>
            {grade}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Small badge text for a content item's grade, e.g. "Grade 9" or "All grades". */
export function gradeLabel(grade: ContentGrade | undefined): string {
  return !grade || grade === 'ALL' ? 'All grades' : grade;
}
