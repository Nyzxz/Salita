export interface ModuleInfo {
  title: string;
  description: string;
}

export function ModuleGrid({ modules }: { modules: ModuleInfo[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {modules.map((module) => (
        <li
          key={module.title}
          className="flex flex-col gap-2 rounded-xl border border-night-border bg-night-panel p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-parchment">{module.title}</h2>
            <span className="flex-none rounded-full border border-night-border px-2.5 py-0.5 text-xs text-muted">
              Coming next
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted">{module.description}</p>
        </li>
      ))}
    </ul>
  );
}
