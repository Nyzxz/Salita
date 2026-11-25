import { useState } from 'react';
import type { PublishingFields } from '@shared/types';
import { Field } from './studioField';

export type PublishMode = 'now' | 'draft' | 'schedule';

/** datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time. */
export function localInput(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** State for the "publish now / draft / schedule" choice that lectures, quizzes and tasks share. */
export function usePublishing() {
  const [mode, setMode] = useState<PublishMode>('now');
  const [at, setAt] = useState('');
  return {
    mode,
    at,
    setMode,
    setAt,
    reset: () => {
      setMode('now');
      setAt('');
    },
    load: (item: PublishingFields) => {
      if (item.draft) {
        setMode('draft');
        setAt('');
      } else if (item.publishAt) {
        setMode('schedule');
        setAt(localInput(item.publishAt));
      } else {
        setMode('now');
        setAt('');
      }
    },
    /** True when "schedule" is chosen but no date was picked. */
    invalid: mode === 'schedule' && !at,
    /** The fields to merge into a create or update request. */
    fields: (): PublishingFields => ({
      ...(mode === 'draft' ? { draft: true } : {}),
      ...(mode === 'schedule' && at ? { publishAt: new Date(at).toISOString() } : {}),
    }),
  };
}

export function PublishControls({ state }: { state: ReturnType<typeof usePublishing> }) {
  const options: Array<{ id: PublishMode; label: string; hint: string }> = [
    { id: 'now', label: 'Publish now', hint: 'Students see it right away.' },
    { id: 'draft', label: 'Save as draft', hint: 'Hidden from students until you publish it.' },
    { id: 'schedule', label: 'Schedule', hint: 'Appears for students at the time you pick.' },
  ];
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-night-border p-4">
      <legend className="field-label px-1">Visibility</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition ${state.mode === option.id ? 'border-gold bg-gold/15 text-parchment' : 'border-night-border text-muted hover:text-parchment'}`}
          >
            <input type="radio" name="visibility" className="sr-only" checked={state.mode === option.id} onChange={() => state.setMode(option.id)} />
            {option.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">{options.find((option) => option.id === state.mode)?.hint}</p>
      {state.mode === 'schedule' && (
        <Field label="Show to students on">
          <input type="datetime-local" required value={state.at} onChange={(event) => state.setAt(event.target.value)} className="field" />
        </Field>
      )}
    </fieldset>
  );
}
