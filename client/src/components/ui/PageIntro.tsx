import type { ReactNode } from 'react';

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}

/** Section heading used at the top of every dashboard panel. */
export function PageIntro({ eyebrow, title, description, action, id }: PageIntroProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 id={id} className="text-2xl font-semibold text-parchment sm:text-[1.75rem]">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
