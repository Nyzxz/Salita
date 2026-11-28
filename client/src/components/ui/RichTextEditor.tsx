import { useRef, useState } from 'react';
import { RichText } from '../../lib/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  required?: boolean;
  id?: string;
}

/** A textarea with Heading / Bold / Bullets / Numbered buttons and a live preview of what students will see. */
export function RichTextEditor({ value, onChange, maxLength, rows = 8, required, id }: RichTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(true);

  const apply = (transform: (selected: string) => string, lineMode: boolean) => {
    const area = ref.current;
    if (!area) return;
    let start = area.selectionStart;
    let end = area.selectionEnd;
    if (lineMode) {
      // Work on whole lines so list marks land at the start of each line.
      start = value.lastIndexOf('\n', start - 1) + 1;
      const nextBreak = value.indexOf('\n', end);
      end = nextBreak === -1 ? value.length : nextBreak;
    }
    const replacement = transform(value.slice(start, end));
    const next = value.slice(0, start) + replacement + value.slice(end);
    if (next.length > maxLength) return;
    onChange(next);
    window.setTimeout(() => {
      area.focus();
      area.setSelectionRange(start, start + replacement.length);
    }, 0);
  };

  const buttons: Array<{ label: string; title: string; run: () => void }> = [
    { label: 'Heading', title: 'Make the line a bold heading', run: () => apply((text) => (text.startsWith('# ') ? text : `# ${text || 'Heading'}`), true) },
    { label: 'Bold', title: 'Bold the selected text', run: () => apply((text) => `**${text || 'bold text'}**`, false) },
    { label: '• Bullets', title: 'Turn the selected lines into a bulleted list', run: () => apply((text) => (text || 'Item').split('\n').map((line) => (/^\s*[-*•]\s/.test(line) ? line : `- ${line}`)).join('\n'), true) },
    { label: '1. Numbered', title: 'Turn the selected lines into a numbered list', run: () => apply((text) => (text || 'Item').split('\n').map((line, index) => `${index + 1}. ${line.replace(/^\s*\d+[.)]\s+/, '')}`).join('\n'), true) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Text formatting">
        {buttons.map((button) => (
          <button key={button.label} type="button" title={button.title} onClick={button.run} className="btn-secondary btn-sm">
            {button.label}
          </button>
        ))}
        <button type="button" className="btn-ghost btn-sm ml-auto" aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
      <textarea
        ref={ref}
        id={id}
        required={required}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field font-mono text-[13px] leading-relaxed"
        placeholder={'Instructions:\nWrite your prompt here.\n\n- A bullet\n   - A nested bullet\n\n1. A numbered step'}
      />
      <p className="text-xs text-muted">
        Tip: a short line ending in “:” becomes a heading. Start lines with “-” for bullets or “1.” for numbers; indent to nest. {value.length}/{maxLength}
      </p>
      {showPreview && value.trim() && (
        <div className="rounded-xl border border-night-border bg-white/[0.02] p-4">
          <p className="eyebrow mb-3">What students will see</p>
          <RichText text={value} />
        </div>
      )}
    </div>
  );
}
