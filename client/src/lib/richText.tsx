import { Fragment, type ReactNode } from 'react';

/**
 * Teachers write instructions as plain text with a few simple marks:
 *   `# Heading` or a short line ending in ":"  → bold heading
 *   `- item` / `* item` / `• item`              → bullet (indent with spaces to nest)
 *   `1. item`                                   → numbered item
 *   `**bold**`                                  → bold
 * Blank lines become spacing, and ordinary line breaks are kept. Everything is rendered as
 * React text, so nothing a teacher types can inject markup.
 */

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index} className="font-semibold text-parchment">{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'bullets'; items: Array<{ text: string; depth: number }> }
  | { kind: 'numbers'; start: number; items: Array<{ text: string; depth: number }> };

const BULLET = /^(\s*)[-*•]\s+(.*)$/;
const NUMBER = /^(\s*)(\d+)[.)]\s+(.*)$/;
const HASH = /^#{1,3}\s+(.*)$/;
const depthOf = (indent: string): number => Math.min(2, Math.floor(indent.replace(/\t/g, '  ').length / 2));

export function parseRichText(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      blocks.push({ kind: 'paragraph', lines: [] }); // a blank line ends the current block
      continue;
    }
    const last = blocks[blocks.length - 1];
    const bullet = BULLET.exec(line);
    const number = NUMBER.exec(line);
    const hash = HASH.exec(line);
    if (hash) {
      blocks.push({ kind: 'heading', text: hash[1] });
    } else if (bullet) {
      const item = { text: bullet[2], depth: depthOf(bullet[1]) };
      if (last?.kind === 'bullets') last.items.push(item);
      else blocks.push({ kind: 'bullets', items: [item] });
    } else if (number) {
      const item = { text: number[3], depth: depthOf(number[1]) };
      if (last?.kind === 'numbers') last.items.push(item);
      else blocks.push({ kind: 'numbers', start: Number(number[2]), items: [item] });
    } else if (!/^\s/.test(line) && line.length <= 60 && line.endsWith(':')) {
      blocks.push({ kind: 'heading', text: line.slice(0, -1) });
    } else if (last?.kind === 'paragraph' && last.lines.length > 0) {
      last.lines.push(line.trim());
    } else {
      blocks.push({ kind: 'paragraph', lines: [line.trim()] });
    }
  }
  return blocks.filter((block) => block.kind !== 'paragraph' || block.lines.length > 0);
}

/** Renders teacher-written instructions with headings, lists and spacing preserved. */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = parseRichText(text);
  return (
    <div className={`flex flex-col gap-3 text-sm leading-relaxed text-muted ${className}`}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return <h4 key={index} className="mt-1 text-sm font-semibold text-parchment">{inline(block.text)}</h4>;
        }
        if (block.kind === 'paragraph') {
          return (
            <p key={index}>
              {block.lines.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  {inline(line)}
                </Fragment>
              ))}
            </p>
          );
        }
        if (block.kind === 'bullets') {
          return (
            <ul key={index} className="flex flex-col gap-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} style={{ marginLeft: `${item.depth * 1.25}rem` }} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                  <span>{inline(item.text)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <ol key={index} className="flex flex-col gap-1.5" start={block.start}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} style={{ marginLeft: `${item.depth * 1.25}rem` }} className="flex gap-2.5">
                <span aria-hidden="true" className="w-5 flex-none text-right font-medium text-gold">{block.start + itemIndex}.</span>
                <span>{inline(item.text)}</span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
